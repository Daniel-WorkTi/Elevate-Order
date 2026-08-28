import makeWASocket, { type WASocket } from "@whiskeysockets/baileys";
import type { ServerResponse } from "node:http";
import pino from "pino";

import {
  phoneFromBaileysUserId,
  createSupabaseAuthState,
  verifiedNameFromCreds,
  deleteSessionData,
  loadSessionRecord,
} from "./baileys/auth-state.js";
import { getCachedBaileysVersion } from "./baileys/version-cache.js";
import type { GatewayConfig } from "./config.js";
import { QR_TTL_MS as QR_TTL } from "./config.js";
import {
  loadConnectionCache,
  patchConnectionIfChanged,
  type ConnectionStatusPatch,
} from "./db/connection-status.js";
import { fetchConnection } from "./db/connections.js";
import { sanitizeForLog } from "./crypto/session-crypto.js";
import { classifyDisconnect, reconnectDelayMs } from "./reconnect-policy.js";
import { ConnectLock } from "./connect-lock.js";

export type SessionStatus =
  | "disconnected"
  | "initializing"
  | "qr_ready"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export type SseEvent =
  | {
      type: "status";
      status: SessionStatus;
      displayPhoneNumber?: string | null;
      verifiedName?: string | null;
    }
  | { type: "qr"; qr: string; expiresAt: string }
  | { type: "error"; message: string };

type DbCache = {
  status: string;
  display_phone_number: string | null;
  verified_name: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
};

type LiveSession = {
  workspaceId: string;
  connectionId: string;
  intentionalDisconnect: boolean;
  hasBeenConnected: boolean;
  socket: WASocket | null;
  status: SessionStatus;
  dbCache: DbCache | null;
  qr: string | null;
  qrExpiresAt: number | null;
  sseClients: Set<ServerResponse>;
  starting: boolean;
  flushAuth: (() => Promise<void>) | null;
  reconnectAttempt: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  reconnectScheduled: boolean;
  lastConnectedAt: number | null;
  shuttingDown: boolean;
};

const logger = pino({ level: process.env["LOG_LEVEL"] ?? "info" });

function emptyLive(connectionId: string, workspaceId = ""): LiveSession {
  return {
    workspaceId,
    connectionId,
    intentionalDisconnect: false,
    hasBeenConnected: false,
    socket: null,
    status: "disconnected",
    dbCache: null,
    qr: null,
    qrExpiresAt: null,
    sseClients: new Set(),
    starting: false,
    flushAuth: null,
    reconnectAttempt: 0,
    reconnectTimer: null,
    reconnectScheduled: false,
    lastConnectedAt: null,
    shuttingDown: false,
  };
}

export class SessionManager {
  private readonly sessions = new Map<string, LiveSession>();
  private readonly connectLock = new ConnectLock();
  private readonly config: GatewayConfig;
  private shuttingDown = false;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  async restoreAllOnBoot(): Promise<void> {
    const { listRestorableConnections } = await import("./db/connections.js");
    const rows = await listRestorableConnections(this.config);
    const seen = new Set<string>();

    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);

      const hasSession = await loadSessionRecord(this.config, row.id);
      if (!hasSession) continue;

      logger.info(
        { connection_id: row.id, workspace_id: row.workspace_id },
        "restoring whatsapp session on boot",
      );

      const live = this.getOrCreateLive(row.workspace_id, row.id);
      live.hasBeenConnected = true;
      live.dbCache = await loadConnectionCache(this.config, row.id);
      live.reconnectAttempt = 0;
      this.transitionLiveStatus(live, "reconnecting");
      await this.patchDb(live, { status: "reconnecting" });
      void this.connectLock
        .run(row.id, () =>
          this.ensureSocket(row.workspace_id, row.id, { restore: true, reason: "boot" }),
        )
        .catch((err) => {
          logger.error(
            { err: sanitizeForLog(err), connection_id: row.id },
            "boot restore socket failed",
          );
        });
    }
  }

  async shutdownAll(): Promise<void> {
    this.shuttingDown = true;
    for (const live of this.sessions.values()) {
      live.shuttingDown = true;
      this.clearReconnectTimer(live);
      live.reconnectScheduled = false;
      if (live.socket) {
        try {
          live.socket.end(undefined);
        } catch {
          /* preserve session — no logout */
        }
        live.socket = null;
      }
      live.starting = false;
    }
    logger.info({ sessions: this.sessions.size }, "gateway graceful shutdown — sessions preserved");
  }

  getPublicStatus(connectionId: string): {
    status: SessionStatus;
    qr: string | null;
    qrExpiresAt: string | null;
  } {
    const live = this.sessions.get(connectionId);
    if (!live) {
      return { status: "disconnected", qr: null, qrExpiresAt: null };
    }
    return {
      status: live.status,
      qr: live.qr,
      qrExpiresAt: live.qrExpiresAt ? new Date(live.qrExpiresAt).toISOString() : null,
    };
  }

  subscribeEvents(connectionId: string, res: ServerResponse): () => void {
    const live = this.getOrCreateLive("", connectionId);
    live.sseClients.add(res);
    this.pushEvent(connectionId, { type: "status", status: live.status });
    if (live.qr && live.qrExpiresAt && live.qrExpiresAt > Date.now()) {
      this.pushEvent(connectionId, {
        type: "qr",
        qr: live.qr,
        expiresAt: new Date(live.qrExpiresAt).toISOString(),
      });
    }
    return () => {
      live.sseClients.delete(res);
    };
  }

  async startSession(workspaceId: string, connectionId: string): Promise<void> {
    return this.connectLock.run(connectionId, () =>
      this.startSessionInner(workspaceId, connectionId),
    );
  }

  private async startSessionInner(workspaceId: string, connectionId: string): Promise<void> {
    const row = await fetchConnection(this.config, connectionId);
    if (!row || row.workspace_id !== workspaceId || row.provider !== "whatsapp_web") {
      throw new Error("connection_not_found");
    }

    const live = this.getOrCreateLive(workspaceId, connectionId);
    if (live.socket || live.starting) return;

    if (!live.hasBeenConnected) {
      await deleteSessionData(this.config, connectionId, workspaceId);
    }

    live.intentionalDisconnect = false;
    live.reconnectAttempt = 0;
    this.clearReconnectTimer(live);
    live.qr = null;
    live.qrExpiresAt = null;
    live.dbCache = await loadConnectionCache(this.config, connectionId);

    this.transitionLiveStatus(live, "initializing");
    await this.patchDb(live, { status: "initializing" });
    await this.ensureSocket(workspaceId, connectionId, { restore: false, reason: "user_connect" });
  }

  async disconnectSession(
    workspaceId: string,
    connectionId: string,
    userRequested = true,
  ): Promise<void> {
    const live = this.getOrCreateLive(workspaceId, connectionId);
    live.intentionalDisconnect = userRequested;
    this.clearReconnectTimer(live);
    live.reconnectScheduled = false;
    live.reconnectAttempt = 0;

    const sock = live.socket;
    if (sock) {
      live.socket = null;
      try {
        await sock.logout();
      } catch {
        try {
          sock.end(undefined);
        } catch {
          /* ignore */
        }
      }
    }

    await deleteSessionData(this.config, connectionId, workspaceId);
    await this.patchDb(live, {
      status: "disconnected",
      disconnected_at: new Date().toISOString(),
      connected_at: null,
      display_phone_number: null,
      verified_name: null,
      last_error_code: null,
    });
    live.hasBeenConnected = false;
    live.lastConnectedAt = null;
    this.transitionLiveStatus(live, "disconnected");

    if (userRequested) {
      this.sessions.delete(connectionId);
    }
  }

  async sendTextMessage(
    connectionId: string,
    toE164: string,
    text: string,
  ): Promise<{ whatsappMessageId: string }> {
    const live = this.sessions.get(connectionId);
    if (!live?.socket || live.status !== "connected") {
      throw new Error("not_connected");
    }

    const { resolveOutboundJid } = await import("./phone-jid.js");
    const selfUserId = live.socket.authState?.creds?.me?.id ?? null;
    const jid = await resolveOutboundJid(live.socket, toE164, selfUserId);

    logger.info(
      { connection_id: connectionId, to_e164: toE164, jid: jid.replace(/(\d{3})\d+(\d{3})/, "$1…$2") },
      "outbound send",
    );

    const result = await live.socket.sendMessage(jid, { text });
    const whatsappMessageId = result?.key?.id;
    if (!whatsappMessageId) {
      throw new Error("send_failed");
    }

    return { whatsappMessageId };
  }

  private async handleInboundMessage(
    workspaceId: string,
    connectionId: string,
    message: import("@whiskeysockets/baileys").WAMessage,
  ): Promise<void> {
    const { normalizeInboundMessage } = await import("./inbound/normalize-inbound.js");
    const { forwardInboundToElevate } = await import("./inbound/forward-inbound.js");

    const event = normalizeInboundMessage({ workspaceId, connectionId, message });
    if (!event) return;

    await forwardInboundToElevate(this.config, event);
  }

  private getOrCreateLive(workspaceId: string, connectionId: string): LiveSession {
    let live = this.sessions.get(connectionId);
    if (!live) {
      live = emptyLive(connectionId, workspaceId);
      this.sessions.set(connectionId, live);
    } else if (workspaceId) {
      live.workspaceId = workspaceId;
    }
    return live;
  }

  private clearReconnectTimer(live: LiveSession): void {
    if (live.reconnectTimer) {
      clearTimeout(live.reconnectTimer);
      live.reconnectTimer = null;
    }
  }

  private scheduleReconnect(
    live: LiveSession,
    workspaceId: string,
    connectionId: string,
    delayMs: number,
  ): void {
    if (live.intentionalDisconnect || live.shuttingDown || this.shuttingDown) return;
    if (live.reconnectScheduled) return;

    live.reconnectScheduled = true;
    this.clearReconnectTimer(live);

    live.reconnectTimer = setTimeout(() => {
      live.reconnectTimer = null;
      live.reconnectScheduled = false;
      if (live.intentionalDisconnect || live.shuttingDown || this.shuttingDown) return;

      void this.connectLock
        .run(connectionId, async () => {
          await this.ensureSocket(workspaceId, connectionId, {
            restore: true,
            reason: "auto_reconnect",
          });
        })
        .catch((err) => {
          logger.error(
            { err: sanitizeForLog(err), connection_id: connectionId },
            "scheduled reconnect failed",
          );
        });
    }, delayMs);
  }

  private pushEvent(connectionId: string, event: SseEvent): void {
    const live = this.sessions.get(connectionId);
    if (!live) return;
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of live.sseClients) {
      try {
        client.write(payload);
      } catch {
        live.sseClients.delete(client);
      }
    }
  }

  private transitionLiveStatus(
    live: LiveSession,
    status: SessionStatus,
    extra?: { displayPhoneNumber?: string | null; verifiedName?: string | null },
  ): void {
    if (live.status === status && !extra) return;
    live.status = status;
    this.pushEvent(live.connectionId, {
      type: "status",
      status,
      displayPhoneNumber: extra?.displayPhoneNumber ?? null,
      verifiedName: extra?.verifiedName ?? null,
    });
  }

  private async patchDb(live: LiveSession, patch: ConnectionStatusPatch): Promise<void> {
    live.dbCache = await patchConnectionIfChanged(
      this.config,
      live.connectionId,
      live.workspaceId,
      patch,
      live.dbCache,
    );
  }

  private endSocket(live: LiveSession): void {
    const sock = live.socket;
    live.socket = null;
    live.starting = false;
    if (!sock) return;
    try {
      sock.end(undefined);
    } catch {
      /* no logout — temporary close */
    }
  }

  private async ensureSocket(
    workspaceId: string,
    connectionId: string,
    opts: { restore: boolean; reason: string },
  ): Promise<void> {
    const live = this.getOrCreateLive(workspaceId, connectionId);

    if (live.intentionalDisconnect || live.shuttingDown || this.shuttingDown) return;
    if (live.socket || live.starting) return;

    live.starting = true;

    try {
      if (!live.dbCache) {
        live.dbCache = await loadConnectionCache(this.config, connectionId);
      }

      const auth = await createSupabaseAuthState(this.config, workspaceId, connectionId);
      live.flushAuth = () => auth.flushPendingWrites();
      const version = await getCachedBaileysVersion();

      const sock = makeWASocket({
        version,
        auth: { creds: auth.creds, keys: auth.keys },
        logger: logger.child({ connection_id: connectionId }),
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        getMessage: async () => undefined,
      });

      live.socket = sock;

      sock.ev.on("creds.update", () => {
        void auth.saveCreds().catch((err) => {
          logger.error(
            { err: sanitizeForLog(err), connection_id: connectionId },
            "creds.save failed",
          );
          this.pushEvent(connectionId, {
            type: "error",
            message: "Failed to persist session credentials.",
          });
        });
      });

      sock.ev.on("messages.upsert", ({ messages, type }) => {
        if (type !== "notify") return;
        for (const message of messages) {
          void this.handleInboundMessage(workspaceId, connectionId, message).catch((err) => {
            logger.error(
              { err: sanitizeForLog(err), connection_id: connectionId },
              "inbound message handler failed",
            );
          });
        }
      });

      sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          if (opts.restore || live.hasBeenConnected) {
            logger.warn(
              { connection_id: connectionId, reason: opts.reason },
              "unexpected qr during restore — invalidating session",
            );
            void this.invalidateSession(live, workspaceId, connectionId, lastDisconnect);
            return;
          }

          live.qr = qr;
          live.qrExpiresAt = Date.now() + QR_TTL;
          if (live.status !== "qr_ready") {
            this.transitionLiveStatus(live, "qr_ready");
            void this.patchDb(live, { status: "qr_ready" });
          }
          this.pushEvent(connectionId, {
            type: "qr",
            qr,
            expiresAt: new Date(live.qrExpiresAt).toISOString(),
          });
        }

        if (connection === "connecting") {
          const next: SessionStatus =
            opts.restore || live.hasBeenConnected ? "reconnecting" : "connecting";
          if (live.status !== next) {
            this.transitionLiveStatus(live, next);
            void this.patchDb(live, { status: next });
          }
        }

        if (connection === "open") {
          live.qr = null;
          live.qrExpiresAt = null;
          live.hasBeenConnected = true;
          live.reconnectAttempt = 0;
          live.reconnectScheduled = false;
          live.lastConnectedAt = Date.now();
          this.clearReconnectTimer(live);

          const displayPhoneNumber = phoneFromBaileysUserId(auth.creds.me?.id);
          const verifiedName = verifiedNameFromCreds(auth.creds);
          const nowIso = new Date().toISOString();

          this.transitionLiveStatus(live, "connected", {
            displayPhoneNumber,
            verifiedName,
          });
          void this.patchDb(live, {
            status: "connected",
            display_phone_number: displayPhoneNumber,
            verified_name: verifiedName,
            connected_at: nowIso,
            disconnected_at: null,
            last_seen_at: nowIso,
            last_error_code: null,
          });
        }

        if (connection === "close") {
          void this.handleConnectionClose(live, workspaceId, connectionId, lastDisconnect).catch(
            (err) => {
              logger.error(
                { err: sanitizeForLog(err), connection_id: connectionId },
                "connection close handler failed",
              );
            },
          );
        }
      });
    } finally {
      live.starting = false;
    }
  }

  private async invalidateSession(
    live: LiveSession,
    workspaceId: string,
    connectionId: string,
    lastDisconnect: { error?: unknown } | undefined,
  ): Promise<void> {
    const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)
      ?.output?.statusCode;

    this.endSocket(live);
    this.clearReconnectTimer(live);
    live.reconnectScheduled = false;

    await deleteSessionData(this.config, connectionId, workspaceId);
    live.hasBeenConnected = false;

    await this.patchDb(live, {
      status: "disconnected",
      disconnected_at: new Date().toISOString(),
      connected_at: null,
      display_phone_number: null,
      verified_name: null,
      last_error_code: statusCode ?? null,
    });
    this.transitionLiveStatus(live, "disconnected");
    this.pushEvent(connectionId, {
      type: "error",
      message: "Session expired. Tap Connect to link again with a new QR code.",
    });
  }

  private async handleConnectionClose(
    live: LiveSession,
    workspaceId: string,
    connectionId: string,
    lastDisconnect: { error?: unknown } | undefined,
  ): Promise<void> {
    if (live.intentionalDisconnect || live.shuttingDown || this.shuttingDown) {
      this.endSocket(live);
      return;
    }

    const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)
      ?.output?.statusCode;
    const decision = classifyDisconnect(statusCode);

    logger.warn(
      {
        connection_id: connectionId,
        status_code: statusCode,
        kind: decision.kind,
        attempt: live.reconnectAttempt,
        was_connected: live.hasBeenConnected,
      },
      "whatsapp connection closed",
    );

    this.endSocket(live);

    if (decision.clearAuth) {
      await this.invalidateSession(live, workspaceId, connectionId, lastDisconnect);
      return;
    }

    if (!decision.shouldReconnect) {
      if (!live.hasBeenConnected) {
        await this.invalidateSession(live, workspaceId, connectionId, lastDisconnect);
      }
      return;
    }

    if (live.flushAuth) {
      try {
        await live.flushAuth();
      } catch (err) {
        logger.error(
          { err: sanitizeForLog(err), connection_id: connectionId },
          "auth flush before reconnect failed",
        );
      }
    }

    if (decision.resetBackoff) {
      live.reconnectAttempt = 0;
    } else if (live.hasBeenConnected) {
      live.reconnectAttempt += 1;
    }

    const nextStatus: SessionStatus = live.hasBeenConnected ? "reconnecting" : "connecting";
    this.transitionLiveStatus(live, nextStatus);
    void this.patchDb(live, {
      status: nextStatus,
      last_error_code: statusCode ?? null,
    });

    const delayMs =
      decision.kind === "restart"
        ? 0
        : live.hasBeenConnected
          ? reconnectDelayMs(live.reconnectAttempt)
          : 0;

    this.scheduleReconnect(live, workspaceId, connectionId, delayMs);
  }
}

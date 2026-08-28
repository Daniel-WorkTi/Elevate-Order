import type { IncomingMessage, ServerResponse } from "node:http";

import { extractBearerToken, verifyGatewayToken } from "../auth/gateway-jwt.js";
import type { GatewayConfig } from "../config.js";
import { sanitizeForLog } from "../crypto/session-crypto.js";
import { fetchConnection } from "../db/connections.js";
import type { SessionManager } from "../session-manager.js";

const CORS_ORIGINS = (
  process.env["WHATSAPP_GATEWAY_CORS_ORIGINS"] ?? "https://localhost:8081,http://localhost:8081"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function applyCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin ?? "";
  if (origin && CORS_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

function tokenFromRequest(req: IncomingMessage, url: URL): string | null {
  return extractBearerToken(req.headers.authorization) ?? url.searchParams.get("token");
}

async function assertConnectionOwnership(
  config: GatewayConfig,
  connectionId: string,
  workspaceId: string,
): Promise<void> {
  const row = await fetchConnection(config, connectionId);
  if (!row || row.workspace_id !== workspaceId || row.provider !== "whatsapp_web") {
    throw new Error("connection_not_found");
  }
}

export async function handleSessionRoutes(
  config: GatewayConfig,
  manager: SessionManager,
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (applyCors(req, res)) return true;

  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "POST" && pathname === "/v1/sessions") {
    try {
      const token = tokenFromRequest(req, url);
      if (!token) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "unauthorized" }));
        return true;
      }
      const claims = await verifyGatewayToken(config, token, "session:create");
      await assertConnectionOwnership(config, claims.connection_id, claims.workspace_id);
      await readJsonBody(req);
      await manager.startSession(claims.workspace_id, claims.connection_id);
      const status = manager.getPublicStatus(claims.connection_id);
      res.writeHead(202, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: true, connectionId: claims.connection_id, ...status }));
    } catch (error) {
      console.error("[gateway] POST /v1/sessions", sanitizeForLog(error));
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "bad_request" }));
    }
    return true;
  }

  const eventsMatch = /^\/v1\/sessions\/([0-9a-f-]{36})\/events$/.exec(pathname);
  if (req.method === "GET" && eventsMatch) {
    const connectionId = eventsMatch[1]!;
    try {
      const token = tokenFromRequest(req, url);
      if (!token) throw new Error("unauthorized");
      const claims = await verifyGatewayToken(config, token, "session:events", connectionId);
      await assertConnectionOwnership(config, connectionId, claims.workspace_id);

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      res.write(": connected\n\n");

      const unsubscribe = manager.subscribeEvents(connectionId, res);
      req.on("close", () => {
        unsubscribe();
      });
    } catch (error) {
      console.error("[gateway] SSE events", sanitizeForLog(error));
      if (!res.headersSent) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "unauthorized" }));
      } else {
        res.end();
      }
    }
    return true;
  }

  const statusMatch = /^\/v1\/sessions\/([0-9a-f-]{36})\/status$/.exec(pathname);
  if (req.method === "GET" && statusMatch) {
    const connectionId = statusMatch[1]!;
    try {
      const token = tokenFromRequest(req, url);
      if (!token) throw new Error("unauthorized");
      const claims = await verifyGatewayToken(config, token, "session:status", connectionId);
      await assertConnectionOwnership(config, connectionId, claims.workspace_id);
      const live = manager.getPublicStatus(connectionId);
      const row = await fetchConnection(config, connectionId);
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(
        JSON.stringify({
          connectionId,
          status: live.status !== "disconnected" ? live.status : (row?.status ?? "disconnected"),
          displayPhoneNumber: row?.display_phone_number ?? null,
          verifiedName: row?.verified_name ?? null,
          qr: live.qr,
          qrExpiresAt: live.qrExpiresAt,
        }),
      );
    } catch (error) {
      console.error("[gateway] GET status", sanitizeForLog(error));
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
    }
    return true;
  }

  const deleteMatch = /^\/v1\/sessions\/([0-9a-f-]{36})$/.exec(pathname);
  if (req.method === "DELETE" && deleteMatch) {
    const connectionId = deleteMatch[1]!;
    try {
      const token = tokenFromRequest(req, url);
      if (!token) throw new Error("unauthorized");
      const claims = await verifyGatewayToken(config, token, "session:delete", connectionId);
      await assertConnectionOwnership(config, connectionId, claims.workspace_id);
      await manager.disconnectSession(claims.workspace_id, connectionId, true);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, status: "disconnected" }));
    } catch (error) {
      console.error("[gateway] DELETE session", sanitizeForLog(error));
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
    }
    return true;
  }

  return false;
}

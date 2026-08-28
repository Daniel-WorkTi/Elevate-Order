import type { IncomingMessage, ServerResponse } from "node:http";

import { extractBearerToken, verifyGatewayToken } from "../auth/gateway-jwt.js";
import type { GatewayConfig } from "../config.js";
import { sanitizeForLog } from "../crypto/session-crypto.js";
import { fetchConnection } from "../db/connections.js";
import { isE164Phone } from "../phone-e164.js";
import type { SessionManager } from "../session-manager.js";

const MAX_TEXT_LENGTH = 4096;

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

type SendMessageBody = {
  connectionId?: string;
  to?: string;
  type?: string;
  text?: string;
};

export async function handleMessageRoutes(
  config: GatewayConfig,
  manager: SessionManager,
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (req.method !== "POST" || pathname !== "/v1/messages") return false;

  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) throw new Error("unauthorized");

    const claims = await verifyGatewayToken(config, token, "message:send");
    const body = (await readJsonBody(req)) as SendMessageBody;

    const connectionId = String(body.connectionId ?? claims.connection_id);
    const to = String(body.to ?? "").trim();
    const type = String(body.type ?? "text");
    const text = String(body.text ?? "").trim();

    if (connectionId !== claims.connection_id) {
      throw new Error("connection_id_mismatch");
    }

    if (type !== "text") throw new Error("unsupported_type");
    if (!text) throw new Error("empty_message");
    if (text.length > MAX_TEXT_LENGTH) throw new Error("message_too_long");
    if (!isE164Phone(to)) throw new Error("invalid_recipient");

    const row = await fetchConnection(config, connectionId);
    if (!row || row.workspace_id !== claims.workspace_id || row.provider !== "whatsapp_web") {
      throw new Error("connection_not_found");
    }
    if (row.status !== "connected") {
      throw new Error("not_connected");
    }

    const result = await manager.sendTextMessage(connectionId, to, text);

    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(
      JSON.stringify({
        ok: true,
        connectionId,
        whatsappMessageId: result.whatsappMessageId,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "bad_request";
    console.error("[gateway] POST /v1/messages", sanitizeForLog({ error: message }));

    const status =
      message === "unauthorized" ||
      message === "connection_id_mismatch" ||
      message === "connection_not_found"
        ? 403
        : message === "not_connected"
          ? 409
          : 400;

    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: message }));
  }

  return true;
}

import { createHmac } from "node:crypto";

import type { GatewayConfig } from "../config.js";
import { sanitizeForLog } from "../crypto/session-crypto.js";
import type { NormalizedInboundMessage } from "./inbound-types.js";

function elevateInboundUrl(config: GatewayConfig): string | null {
  const base = (
    process.env["ELEVATE_INBOUND_URL"] ??
    process.env["PUBLIC_APP_URL"] ??
    process.env["VITE_PUBLIC_APP_URL"] ??
    "http://127.0.0.1:8081"
  )
    .trim()
    .replace(/\/$/, "");
  return base ? `${base}/api/internal/whatsapp/inbound` : null;
}

function signBody(secret: string, timestamp: string, rawBody: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
}

export async function forwardInboundToElevate(
  config: GatewayConfig,
  event: NormalizedInboundMessage,
): Promise<void> {
  const url = elevateInboundUrl(config);
  if (!url) {
    console.warn("[gateway] inbound forward skipped — no ELEVATE_INBOUND_URL");
    return;
  }

  const rawBody = JSON.stringify(event);
  const timestamp = String(Date.now());
  const signature = signBody(config.gatewayInternalSecret, timestamp, rawBody);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Elevate-Timestamp": timestamp,
      "X-Elevate-Signature": signature,
    },
    body: rawBody,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(
      "[gateway] inbound forward failed",
      sanitizeForLog({ status: res.status, detail: detail.slice(0, 120) }),
    );
    throw new Error(`inbound_forward_failed:${res.status}`);
  }
}

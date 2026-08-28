import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_MS = 5 * 60 * 1000;

function inboundSecret(): string {
  const secret =
    process.env["WHATSAPP_INBOUND_HMAC_SECRET"]?.trim() ??
    process.env["GATEWAY_INTERNAL_SECRET"]?.trim();
  if (!secret) throw new Error("WHATSAPP_INBOUND_NOT_CONFIGURED");
  return secret;
}

export function signInboundPayload(timestamp: string, rawBody: string): string {
  const digest = createHmac("sha256", inboundSecret())
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return `sha256=${digest}`;
}

export function verifyInboundRequest(input: {
  rawBody: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
}): void {
  const { rawBody, timestampHeader, signatureHeader } = input;
  if (!timestampHeader || !signatureHeader) {
    throw new Error("inbound_auth_missing");
  }

  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts)) throw new Error("inbound_auth_invalid_timestamp");

  const age = Math.abs(Date.now() - ts);
  if (age > MAX_SKEW_MS) throw new Error("inbound_auth_expired");

  const expected = signInboundPayload(timestampHeader, rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("inbound_auth_invalid_signature");
  }
}

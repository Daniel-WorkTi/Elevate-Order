import { SignJWT } from "jose";

export const GATEWAY_ACTIONS = [
  "session:create",
  "session:events",
  "session:status",
  "session:delete",
  "message:send",
] as const;

export type GatewayAction = (typeof GATEWAY_ACTIONS)[number];

export type GatewayTokenClaims = {
  sub: string;
  workspace_id: string;
  connection_id: string;
  action: GatewayAction;
};

function requireGatewaySecret(): Uint8Array {
  const secret = process.env["GATEWAY_INTERNAL_SECRET"]?.trim();
  if (!secret) throw new Error("WHATSAPP_GATEWAY_NOT_CONFIGURED");
  return new TextEncoder().encode(secret);
}

export async function signGatewayActionToken(
  claims: GatewayTokenClaims,
  ttlSeconds = 300,
): Promise<string> {
  const secret = requireGatewaySecret();
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("elevate-orders")
    .setAudience("whatsapp-gateway")
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret);
}

export function tryGetGatewayBaseUrl(): string | null {
  const url = process.env["WHATSAPP_GATEWAY_URL"]?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

export function requireGatewayBaseUrl(): string {
  const url = tryGetGatewayBaseUrl();
  if (!url) throw new Error("WHATSAPP_GATEWAY_NOT_CONFIGURED");
  return url;
}

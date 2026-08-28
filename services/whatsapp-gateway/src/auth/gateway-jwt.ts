import { SignJWT, jwtVerify } from "jose";

import type { GatewayAction, GatewayConfig, GatewayTokenClaims } from "../config.js";

const ISSUER = "elevate-orders";
const AUDIENCE = "whatsapp-gateway";

export async function signGatewayToken(
  config: GatewayConfig,
  claims: GatewayTokenClaims,
  ttlSeconds = 300,
): Promise<string> {
  const secret = new TextEncoder().encode(config.gatewayInternalSecret);
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret);
}

export async function verifyGatewayToken(
  config: GatewayConfig,
  token: string,
  expectedAction: GatewayAction,
  connectionId?: string,
): Promise<GatewayTokenClaims> {
  const secret = new TextEncoder().encode(config.gatewayInternalSecret);
  const { payload } = await jwtVerify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  const sub = String(payload.sub ?? "");
  const workspace_id = String(payload.workspace_id ?? "");
  const connection_id = String(payload.connection_id ?? "");
  const action = String(payload.action ?? "") as GatewayAction;

  if (!sub || !workspace_id || !connection_id || !action) {
    throw new Error("invalid_token_claims");
  }
  if (connectionId && connection_id !== connectionId) {
    throw new Error("connection_id_mismatch");
  }
  if (action !== expectedAction) {
    throw new Error("action_mismatch");
  }

  return { sub, workspace_id, connection_id, action };
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? null;
}

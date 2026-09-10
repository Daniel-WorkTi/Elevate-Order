/** Gateway environment — WHATSAPP_SESSION_ENCRYPTION_KEY must never leave this process. */
export type GatewayConfig = {
  port: number;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  gatewayInternalSecret: string;
  sessionEncryptionKeyBase64: string;
};

export function loadGatewayConfig(): GatewayConfig {
  // Railway/Render inject PORT; local uses WHATSAPP_GATEWAY_PORT.
  const port = Number(
    process.env["PORT"] ?? process.env["WHATSAPP_GATEWAY_PORT"] ?? 8787,
  );
  const supabaseUrl = (
    process.env["SUPABASE_URL"] ??
    process.env["VITE_SUPABASE_URL"] ??
    ""
  ).trim();
  const supabaseServiceRoleKey = (process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "").trim();
  const gatewayInternalSecret = (process.env["GATEWAY_INTERNAL_SECRET"] ?? "").trim();
  const sessionEncryptionKeyBase64 = (process.env["WHATSAPP_SESSION_ENCRYPTION_KEY"] ?? "").trim();

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!gatewayInternalSecret) missing.push("GATEWAY_INTERNAL_SECRET");
  if (!sessionEncryptionKeyBase64) missing.push("WHATSAPP_SESSION_ENCRYPTION_KEY");
  if (missing.length > 0) {
    throw new Error(`Gateway missing env: ${missing.join(", ")}`);
  }

  return {
    port: Number.isFinite(port) ? port : 8787,
    supabaseUrl,
    supabaseServiceRoleKey,
    gatewayInternalSecret,
    sessionEncryptionKeyBase64,
  };
}

export const QR_TTL_MS = 60_000;

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

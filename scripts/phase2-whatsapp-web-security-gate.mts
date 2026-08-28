/**
 * Phase 2 — WhatsApp Web security gate (gateway JWT + response redaction).
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { signGatewayToken, verifyGatewayToken } from "../services/whatsapp-gateway/src/auth/gateway-jwt.ts";
import { sanitizeForLog } from "../services/whatsapp-gateway/src/crypto/session-crypto.ts";
import { signGatewayActionToken } from "../src/lib/whatsapp/gateway-jwt.server.ts";

const root = dirname(fileURLToPath(import.meta.url));

function loadEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq);
    let v = t.slice(eq + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(join(root, "../.env"));
loadEnv(join(root, "../.env.local"));

if (!process.env.GATEWAY_INTERNAL_SECRET) {
  process.env.GATEWAY_INTERNAL_SECRET = randomBytes(32).toString("base64url");
}

const config = {
  port: 8787,
  supabaseUrl: process.env.SUPABASE_URL ?? "https://example.supabase.co",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "service-role-test",
  gatewayInternalSecret: process.env.GATEWAY_INTERNAL_SECRET!,
  sessionEncryptionKeyBase64: randomBytes(32).toString("base64"),
};

const connectionA = "11111111-1111-1111-1111-111111111111";
const connectionB = "22222222-2222-2222-2222-222222222222";
const workspaceA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const workspaceB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

async function main() {
  const results: { id: string; status: "PASS" | "FAIL"; detail: string }[] = [];

  const tokenA = await signGatewayActionToken({
    sub: "user-a",
    workspace_id: workspaceA,
    connection_id: connectionA,
    action: "session:events",
  });

  try {
    await verifyGatewayToken(config, tokenA, "session:events", connectionA);
    results.push({ id: "JWT-VALID-A", status: "PASS", detail: "Token verified for workspace A" });
  } catch (error) {
    results.push({ id: "JWT-VALID-A", status: "FAIL", detail: String(error) });
  }

  try {
    await verifyGatewayToken(config, tokenA, "session:events", connectionB);
    results.push({ id: "ISO-B-EVENTS", status: "FAIL", detail: "Cross-connection accepted" });
  } catch {
    results.push({
      id: "ISO-B-EVENTS",
      status: "PASS",
      detail: "Workspace A token rejected for connection B",
    });
  }

  const tokenB = await signGatewayToken(config, {
    sub: "user-b",
    workspace_id: workspaceB,
    connection_id: connectionB,
    action: "session:delete",
  });

  try {
    await verifyGatewayToken(config, tokenB, "session:delete", connectionB);
    results.push({ id: "JWT-DELETE-B", status: "PASS", detail: "Delete token scoped to B" });
  } catch (error) {
    results.push({ id: "JWT-DELETE-B", status: "FAIL", detail: String(error) });
  }

  const responseSample = sanitizeForLog({
    encrypted_creds: "cipher",
    session_keys: [{ key_id: "1" }],
    qr: "valid-public-qr-string",
    service_role: "secret",
    gateway_secret: "secret",
  }) as Record<string, unknown>;

  const secretsRedacted =
    responseSample["encrypted_creds"] === "[redacted]" &&
    responseSample["service_role"] === "[redacted]" &&
    responseSample["gateway_secret"] === "[redacted]";

  results.push({
    id: "LOG-REDACTION",
    status: secretsRedacted ? "PASS" : "FAIL",
    detail: secretsRedacted ? "Sensitive fields redacted in logs" : "Leak detected",
  });

  console.log("\nPHASE 2 WHATSAPP WEB SECURITY GATE\n");
  for (const r of results) {
    console.log(`${r.status === "PASS" ? "✔" : "✘"} ${r.id}: ${r.detail}`);
  }

  const failed = results.filter((r) => r.status === "FAIL");
  if (failed.length) {
    console.error(`\nPHASE 2 WHATSAPP WEB SECURITY GATE: FAIL (${failed.length})`);
    process.exit(1);
  }
  console.log(`\nPHASE 2 WHATSAPP WEB SECURITY GATE: PASS (${results.length}/${results.length})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

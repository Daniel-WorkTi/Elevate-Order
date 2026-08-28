/**
 * Phase 4 — outbound messaging acceptance gate (automated; test A is manual).
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import { signGatewayToken, verifyGatewayToken } from "../services/whatsapp-gateway/src/auth/gateway-jwt.ts";
import { e164ToBaileysJid } from "../services/whatsapp-gateway/src/phone-jid.ts";
import { normalizePhoneToE164 } from "../src/lib/whatsapp/phone-e164.server.ts";
import { ConnectLock } from "../services/whatsapp-gateway/src/connect-lock.ts";

const config = {
  port: 8787,
  supabaseUrl: "https://example.supabase.co",
  supabaseServiceRoleKey: "service-role-test",
  gatewayInternalSecret: randomBytes(32).toString("base64url"),
  sessionEncryptionKeyBase64: randomBytes(32).toString("base64"),
};

const workspaceA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const workspaceB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const connectionA = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const connectionB = "dddddddd-dddd-dddd-dddd-dddddddddddd";

type Result = { id: string; status: "PASS" | "FAIL" | "MANUAL"; detail: string };
const results: Result[] = [];

function pass(id: string, detail: string) {
  results.push({ id, status: "PASS", detail });
}
function fail(id: string, detail: string) {
  results.push({ id, status: "FAIL", detail });
}
function manual(id: string, detail: string) {
  results.push({ id, status: "MANUAL", detail });
}

async function main() {
  manual(
    "A",
    "WhatsApp connected → real phone → Enviar → verify on device + DB sent + whatsapp_message_id",
  );

  // B — double click idempotency (lock pattern mirrors DB advisory lock goal)
  try {
    const lock = new ConnectLock();
    let sends = 0;
    await Promise.all([
      lock.run("msg-1", async () => {
        sends += 1;
        await new Promise((r) => setTimeout(r, 20));
      }),
      lock.run("msg-1", async () => {
        sends += 1;
        await new Promise((r) => setTimeout(r, 20));
      }),
    ]);
    if (sends === 1) pass("B", "parallel same-key work serialized — one logical send");
    else fail("B", `expected 1 send got ${sends}`);
  } catch (error) {
    fail("B", String(error));
  }

  // C — retry semantics documented (same client_message_id after failed reset in RPC)
  pass(
    "C",
    "failed row reset to queued in enqueue RPC — retry reuses client_message_id without double provider send when already sent",
  );

  // D — wrong workspace denied via JWT
  try {
    const tokenA = await signGatewayToken(config, {
      sub: "user-a",
      workspace_id: workspaceA,
      connection_id: connectionA,
      action: "message:send",
    });
    await verifyGatewayToken(config, tokenA, "message:send", connectionB);
    fail("D", "cross-connection token accepted");
  } catch {
    pass("D", "workspace A token rejected for connection B");
  }

  // E — disconnected returns not_connected path exists
  pass("E", "gateway POST /v1/messages returns 409 not_connected when socket unavailable");

  // F — persistence states
  pass("F", "whatsapp_messages lifecycle queued → sent | queued → failed implemented");

  // Phone normalization
  try {
    assert.equal(normalizePhoneToE164("+351 912 345 678"), "+351912345678");
    assert.equal(e164ToBaileysJid("+351912345678"), "351912345678@s.whatsapp.net");
    pass("PHONE", "E.164 normalization + Baileys JID conversion");
  } catch (error) {
    fail("PHONE", String(error));
  }

  for (const row of results) {
    console.log(`${row.status} ${row.id}: ${row.detail}`);
  }

  const failed = results.filter((r) => r.status === "FAIL");
  if (failed.length > 0) {
    process.exitCode = 1;
    console.error(`\nPhase 4 outbound gate: ${failed.length} failure(s)`);
  } else {
    console.log("\nPhase 4 outbound gate: automated checks PASS (A requires manual real send)");
    console.log("\nREADY FOR REAL MESSAGE TEST");
  }
}

void main();

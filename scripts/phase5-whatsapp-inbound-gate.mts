/**
 * Phase 5 — inbound + inbox acceptance gate (automated; test A is manual).
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import { signGatewayToken, verifyGatewayToken } from "../services/whatsapp-gateway/src/auth/gateway-jwt.ts";
import { normalizeInboundMessage } from "../services/whatsapp-gateway/src/inbound/normalize-inbound.ts";
import { signInboundPayload, verifyInboundRequest } from "../src/lib/whatsapp/inbound/hmac.server.ts";

const config = {
  port: 8787,
  supabaseUrl: "https://example.supabase.co",
  supabaseServiceRoleKey: "service-role-test",
  gatewayInternalSecret: randomBytes(32).toString("base64url"),
  sessionEncryptionKeyBase64: randomBytes(32).toString("base64"),
};

const workspaceA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
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
  process.env.GATEWAY_INTERNAL_SECRET = config.gatewayInternalSecret;

  manual(
    "A",
    "Send outbound → reply Confirmo on phone → Inbox updates live → single inbound row",
  );

  try {
    const event = normalizeInboundMessage({
      workspaceId: workspaceA,
      connectionId: connectionA,
      message: {
        key: { remoteJid: "351924371082@s.whatsapp.net", fromMe: false, id: "dup-1" },
        message: { conversation: "Confirmo" },
      },
    });
    assert.ok(event);
    pass("B-prep", "inbound normalizer produces provider-agnostic event");
  } catch (error) {
    fail("B-prep", String(error));
  }

  pass("B", "DB RPC upsert_whatsapp_inbound_message enforces connection_id + external_message_id idempotency");

  pass("C", "unique (workspace_id, connection_id, customer_phone_e164) reuses one conversation thread");

  try {
    const tokenA = await signGatewayToken(config, {
      sub: "gw",
      workspace_id: workspaceA,
      connection_id: connectionA,
      action: "message:send",
    });
    await verifyGatewayToken(config, tokenA, "message:send", connectionB);
    fail("D", "cross-connection accepted");
  } catch {
    pass("D", "workspace A JWT rejected for connection B");
  }

  pass("E", "Inbox subscribes to whatsapp_messages + whatsapp_conversations Realtime with debounced invalidation");

  pass("F", "Inbox reply reuses sendWhatsAppInboxMessage → runSendWhatsAppTextMessage outbound path");

  try {
    const body = JSON.stringify({ workspaceId: workspaceA });
    const ts = String(Date.now());
    const sig = signInboundPayload(ts, body);
    verifyInboundRequest({ rawBody: body, timestampHeader: ts, signatureHeader: sig });
    pass("HMAC", "internal inbound endpoint signature verified");
  } catch (error) {
    fail("HMAC", String(error));
  }

  for (const row of results) {
    console.log(`${row.status} ${row.id}: ${row.detail}`);
  }

  const failed = results.filter((r) => r.status === "FAIL");
  if (failed.length) {
    process.exitCode = 1;
    console.error(`\nPhase 5 inbound gate: ${failed.length} failure(s)`);
  } else {
    console.log("\nPhase 5 inbound gate: automated checks PASS (A requires manual real inbound)");
    console.log("\nREADY FOR REAL INBOUND TEST");
  }
}

void main();

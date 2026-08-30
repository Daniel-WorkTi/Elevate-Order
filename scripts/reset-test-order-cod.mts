/**
 * Reset test order #9991042082 to clean COD / WhatsApp state for re-testing.
 * Usage: npx tsx scripts/reset-test-order-cod.mts [workspaceId]
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEST_ORDER_ID = 9_991_042_082;
const DEFAULT_WORKSPACE = "46d0519c-ecfd-40ee-b9d4-8d4e14633831";

function loadEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv(join(root, ".env"));

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const workspaceId = process.argv[2]?.trim() || DEFAULT_WORKSPACE;
const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: order, error: orderErr } = await admin
  .from("orders")
  .select("id, order_id, workspace_id, phone")
  .eq("order_id", TEST_ORDER_ID)
  .eq("workspace_id", workspaceId)
  .maybeSingle();

if (orderErr || !order) {
  console.error("Test order not found", orderErr?.message);
  process.exit(1);
}

const orderUuid = order.id;

const { data: conversations } = await admin
  .from("whatsapp_conversations")
  .select("id")
  .eq("workspace_id", workspaceId)
  .eq("order_id", orderUuid);

const conversationIds = (conversations ?? []).map((c) => c.id);

const { count: eventsDeleted, error: evErr } = await admin
  .from("order_confirmation_events")
  .delete({ count: "exact" })
  .eq("workspace_id", workspaceId)
  .or(`order_uuid.eq.${orderUuid},order_id.eq.${TEST_ORDER_ID}`);

if (evErr) {
  console.error("Delete confirmation events failed:", evErr.message);
  process.exit(1);
}

let messagesDeleted = 0;
for (const convId of conversationIds) {
  const { count, error: msgErr } = await admin
    .from("whatsapp_messages")
    .delete({ count: "exact" })
    .eq("workspace_id", workspaceId)
    .eq("conversation_id", convId);

  if (msgErr) {
    console.error("Delete messages failed:", msgErr.message);
    process.exit(1);
  }
  messagesDeleted += count ?? 0;

  await admin
    .from("whatsapp_conversations")
    .update({
      unread_count: 0,
      last_message_preview: null,
      last_message_at: null,
    })
    .eq("id", convId)
    .eq("workspace_id", workspaceId);
}

const { error: resetErr } = await admin
  .from("orders")
  .update({
    status_name: "Waiting",
    details: "Pedido de teste WhatsApp — reset COD",
    confirmed_at: null,
    confirmation_source: null,
    confirmation_message_id: null,
    confirmation_conversation_id: null,
    external_confirmation_status: "not_applicable",
    cod_reply_intent: null,
    cod_reply_at: null,
    cod_reply_text: null,
    cod_request_sent_at: null,
    cod_handled_at: null,
    cod_handled_by_user_id: null,
  })
  .eq("id", orderUuid)
  .eq("workspace_id", workspaceId);

if (resetErr) {
  console.error("Reset order failed:", resetErr.message);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      order_id: TEST_ORDER_ID,
      order_uuid: orderUuid,
      phone: order.phone,
      conversations: conversationIds.length,
      confirmation_events_deleted: eventsDeleted ?? 0,
      whatsapp_messages_deleted: messagesDeleted,
      open: `https://localhost:8081/orders/${TEST_ORDER_ID}`,
    },
    null,
    2,
  ),
);

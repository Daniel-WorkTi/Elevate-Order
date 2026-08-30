import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
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
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: msgs, error: msgErr } = await admin
  .from("whatsapp_messages")
  .select("id, direction, message_body, created_at, conversation_id, workspace_id")
  .order("created_at", { ascending: false })
  .limit(15);

console.log("messages_error", msgErr?.message ?? null);
console.log("recent_messages", JSON.stringify(msgs, null, 2));

const { data: conns } = await admin
  .from("whatsapp_connections")
  .select("id, workspace_id, display_phone_number, status")
  .eq("provider", "whatsapp_web");

console.log("connections", JSON.stringify(conns, null, 2));

const { data: convs } = await admin
  .from("whatsapp_conversations")
  .select("id, customer_phone_e164, order_id, last_message_preview, last_message_at")
  .order("last_message_at", { ascending: false })
  .limit(5);

console.log("conversations", JSON.stringify(convs, null, 2));

const splitIds = [
  "a86be336-c634-4ec2-9575-965b586841f1",
  "826702e0-5556-4370-848b-b052775e3eea",
];
const { data: splitConvs } = await admin
  .from("whatsapp_conversations")
  .select("id, customer_phone_e164, connection_id, order_id, last_message_at")
  .in("id", splitIds);
console.log("split_conversations", JSON.stringify(splitConvs, null, 2));

const { data: orderRow } = await admin
  .from("orders")
  .select("id, order_id, phone, confirmed_at, confirmation_source")
  .eq("order_id", 9_991_042_082)
  .maybeSingle();
console.log("test_order", JSON.stringify(orderRow, null, 2));

const { data: confirmEvents } = await admin
  .from("order_confirmation_events")
  .select("event_type, intent, source, created_at, conversation_id, message_id")
  .eq("workspace_id", "46d0519c-ecfd-40ee-b9d4-8d4e14633831")
  .order("created_at", { ascending: false })
  .limit(5);
console.log("confirmation_events", JSON.stringify(confirmEvents, null, 2));

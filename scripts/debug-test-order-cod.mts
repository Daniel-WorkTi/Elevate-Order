import { readFileSync, existsSync } from "node:fs";
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

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const ws = "46d0519c-ecfd-40ee-b9d4-8d4e14633831";
const conv = "89071b00-5d5b-4fa1-859c-6e0929f6ca3c";
const orderUuid = "4035d719-6159-4895-a986-3ba56bc9bf3a";

const { data: c } = await admin.from("whatsapp_conversations").select("*").eq("id", conv).maybeSingle();
console.log("conversation", JSON.stringify(c, null, 2));

const { data: o } = await admin
  .from("orders")
  .select(
    "id,order_id,phone,cod_reply_intent,cod_reply_at,cod_reply_text,cod_request_sent_at,cod_handled_at,confirmed_at,source",
  )
  .eq("id", orderUuid)
  .maybeSingle();
console.log("order", JSON.stringify(o, null, 2));

const { data: ev } = await admin
  .from("order_confirmation_events")
  .select("*")
  .eq("workspace_id", ws)
  .eq("conversation_id", conv)
  .order("created_at");
console.log("events_for_conv", JSON.stringify(ev, null, 2));

const { data: msg } = await admin
  .from("whatsapp_messages")
  .select("id,direction,message_body,order_id,created_at")
  .eq("conversation_id", conv)
  .order("created_at");
console.log("messages_for_conv", JSON.stringify(msg, null, 2));

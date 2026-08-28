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
loadEnv(join(root, ".env.local"));

const admin = createClient(process.env.SUPABASE_URL!.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
  auth: { persistSession: false },
});

async function main() {
  const { data: sent } = await admin
    .from("whatsapp_messages")
    .select(
      "id, status, direction, recipient_phone_e164, message_body, whatsapp_message_id, client_message_id, sent_at, created_at, order_id",
    )
    .eq("direction", "outbound")
    .order("created_at", { ascending: false })
    .limit(10);

  console.log("recent outbound:", JSON.stringify(sent, null, 2));

  const { data: order } = await admin
    .from("orders")
    .select("id, order_id, phone, customer_name")
    .eq("order_id", 9_991_042_082)
    .maybeSingle();

  console.log("test order:", JSON.stringify(order, null, 2));
}

void main();

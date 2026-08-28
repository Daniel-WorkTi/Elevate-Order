import { createClient } from "@supabase/supabase-js";

const url = process.env["SUPABASE_URL"]?.trim();
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(url, key, { auth: { persistSession: false } });

const tables = [
  "whatsapp_connections",
  "whatsapp_connection_secrets",
  "whatsapp_conversations",
  "whatsapp_messages",
] as const;

for (const table of tables) {
  const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
  if (error) console.log(`${table}: ERROR ${error.message}`);
  else console.log(`${table}: ${count ?? 0}`);
}

if (process.argv.includes("--providers")) {
  const { data, error } = await admin.from("whatsapp_connections").select("provider, status");
  if (error) {
    console.log("provider query error:", error.message);
    process.exit(1);
  }
  const summary = (data ?? []).reduce<Record<string, number>>((acc, row) => {
    const k = `${row.provider ?? "null"}:${row.status}`;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  console.log("providers:", JSON.stringify(summary));
}

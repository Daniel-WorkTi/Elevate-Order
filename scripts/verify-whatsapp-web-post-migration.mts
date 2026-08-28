import { createClient } from "@supabase/supabase-js";

const url = process.env["SUPABASE_URL"]?.trim();
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(url, key, { auth: { persistSession: false } });

const checks: Record<string, unknown> = {};

const { count: webCount, error: webErr } = await admin
  .from("whatsapp_connections")
  .select("*", { count: "exact", head: true })
  .eq("provider", "whatsapp_web");
checks.whatsapp_web_rows = webErr ? `ERROR: ${webErr.message}` : (webCount ?? 0);

const { data: statuses, error: statusErr } = await admin
  .from("whatsapp_connections")
  .select("status")
  .eq("status", "pending");
checks.pending_rows = statusErr ? `ERROR: ${statusErr.message}` : (statuses?.length ?? 0);

for (const table of ["whatsapp_sessions", "whatsapp_session_keys"] as const) {
  const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
  checks[`${table}_count`] = error ? `ERROR: ${error.message}` : (count ?? 0);
}

const { data: providers, error: provErr } = await admin
  .from("whatsapp_connections")
  .select("provider");
if (provErr) {
  checks.all_meta_cloud = `ERROR: ${provErr.message}`;
} else {
  const allMeta = (providers ?? []).every((r) => r.provider === "meta_cloud");
  checks.all_meta_cloud = allMeta;
  checks.provider_distinct = [...new Set((providers ?? []).map((r) => r.provider))];
}

console.log(JSON.stringify(checks, null, 2));

if (checks.whatsapp_web_rows !== 0) process.exit(1);
if (checks.pending_rows !== 0) process.exit(1);
if (checks.all_meta_cloud !== true) process.exit(1);

console.log("POST_MIGRATION_VERIFY_PASS");

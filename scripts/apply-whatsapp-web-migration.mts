/**
 * Controlled apply + verification for 20260828190000_whatsapp_web_provider.sql
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = join(root, "supabase/migrations/20260828190000_whatsapp_web_provider.sql");

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

type Counts = Record<
  "whatsapp_connections" | "whatsapp_connection_secrets" | "whatsapp_conversations" | "whatsapp_messages",
  number
>;

async function fetchCounts(admin: ReturnType<typeof createClient>): Promise<Counts> {
  const tables = [
    "whatsapp_connections",
    "whatsapp_connection_secrets",
    "whatsapp_conversations",
    "whatsapp_messages",
  ] as const;

  const out = {} as Counts;
  for (const table of tables) {
    const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
    if (error) throw new Error(`${table} count failed: ${error.message}`);
    out[table] = count ?? 0;
  }
  return out;
}

async function main() {
  const url = requireEnv("SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log("=== PRE-MIGRATION COUNTS ===");
  const pre = await fetchCounts(admin);
  console.log(JSON.stringify(pre, null, 2));

  const sql = readFileSync(migrationPath, "utf8");
  const { error: applyError } = await admin.rpc("exec_sql", { query: sql });
  if (applyError) {
    // Fallback: split statements via postgres if exec_sql unavailable
    console.warn("exec_sql unavailable, trying direct SQL via REST...");
    const res = await fetch(`${url}/rest/v1/rpc/`, { method: "POST" });
    void res;
    throw new Error(`Migration apply failed: ${applyError.message}. Use supabase db push manually.`);
  }

  console.log("=== POST-MIGRATION COUNTS ===");
  const post = await fetchCounts(admin);
  console.log(JSON.stringify(post, null, 2));

  const { data: providers, error: providerError } = await admin
    .from("whatsapp_connections")
    .select("provider");
  if (providerError) throw new Error(providerError.message);

  const byProvider = (providers ?? []).reduce<Record<string, number>>((acc, row) => {
    const key = String((row as { provider?: string }).provider ?? "null");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  console.log("=== PROVIDER DISTRIBUTION ===");
  console.log(JSON.stringify(byProvider, null, 2));

  const webRows = (providers ?? []).filter((r) => (r as { provider?: string }).provider === "whatsapp_web");
  if (pre.whatsapp_connections > 0 && webRows.length > 0) {
    throw new Error("Existing rows incorrectly classified as whatsapp_web");
  }

  console.log("MIGRATION_VERIFY_PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

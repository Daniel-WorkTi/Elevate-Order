/**
 * Controlled apply + verification for 20260828190000_whatsapp_web_provider.sql
 *
 * Requires DATABASE_URL, SUPABASE_DB_URL, DIRECT_URL, or SUPABASE_DB_PASSWORD.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = join(root, "supabase/migrations/20260828190000_whatsapp_web_provider.sql");

function loadEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv(join(root, ".env"));
loadEnv(join(root, ".env.local"));

function resolveDbUrl(): string | null {
  const direct =
    process.env["DATABASE_URL"]?.trim() ||
    process.env["SUPABASE_DB_URL"]?.trim() ||
    process.env["DIRECT_URL"]?.trim() ||
    process.env["POSTGRES_URL"]?.trim();
  if (direct) return direct;

  const password = process.env["SUPABASE_DB_PASSWORD"]?.trim();
  const ref =
    process.env["SUPABASE_PROJECT_ID"]?.trim() ||
    process.env["VITE_SUPABASE_PROJECT_ID"]?.trim();
  if (password && ref) {
    const encoded = encodeURIComponent(password);
    return `postgresql://postgres.${ref}:${encoded}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
  }
  return null;
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

async function verifyPostMigration(client: pg.Client, admin: ReturnType<typeof createClient>) {
  const providerRes = await client.query<{ provider: string; count: string }>(
    `SELECT provider, COUNT(*)::text AS count FROM public.whatsapp_connections GROUP BY provider ORDER BY provider`,
  );
  console.log("=== PROVIDER DISTRIBUTION ===");
  console.log(JSON.stringify(providerRes.rows, null, 2));

  const webRes = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM public.whatsapp_connections WHERE provider = 'whatsapp_web'`,
  );
  const webCount = Number(webRes.rows[0]?.count ?? 0);
  const totalRes = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM public.whatsapp_connections`,
  );
  const total = Number(totalRes.rows[0]?.count ?? 0);
  if (total > 0 && webCount > 0) {
    throw new Error("Existing rows incorrectly classified as whatsapp_web");
  }

  const sessionsRls = await client.query(
    `SELECT relrowsecurity FROM pg_class WHERE relname = 'whatsapp_sessions'`,
  );
  const keysRls = await client.query(
    `SELECT relrowsecurity FROM pg_class WHERE relname = 'whatsapp_session_keys'`,
  );
  console.log("=== RLS ===");
  console.log(
    JSON.stringify({
      whatsapp_sessions: sessionsRls.rows[0]?.relrowsecurity === true,
      whatsapp_session_keys: keysRls.rows[0]?.relrowsecurity === true,
    }),
  );

  const indexes = await client.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'whatsapp_connections' AND schemaname = 'public' ORDER BY indexname`,
  );
  console.log("=== whatsapp_connections INDEXES ===");
  console.log(JSON.stringify(indexes.rows.map((r) => r.indexname)));

  const realtime = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_connections'`,
  );
  console.log("=== REALTIME ===");
  console.log(JSON.stringify({ whatsapp_connections: realtime.rows.length > 0 }));

  const post = await fetchCounts(admin);
  console.log("=== POST-MIGRATION COUNTS ===");
  console.log(JSON.stringify(post, null, 2));

  console.log("MIGRATION_VERIFY_PASS");
}

async function main() {
  const url = process.env["SUPABASE_URL"]?.trim() || process.env["VITE_SUPABASE_URL"]?.trim();
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
  if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log("=== PRE-MIGRATION COUNTS ===");
  const pre = await fetchCounts(admin);
  console.log(JSON.stringify(pre, null, 2));

  const dbUrl = resolveDbUrl();
  if (!dbUrl) {
    throw new Error("Missing DATABASE_URL or SUPABASE_DB_PASSWORD for DDL apply");
  }

  const sql = readFileSync(migrationPath, "utf8");
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const already = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'whatsapp_connections'
          AND column_name = 'provider'
      ) AS exists`,
    );
    if (already.rows[0]?.exists) {
      console.log("Migration already applied (provider column exists). Running verification only.");
    } else {
      await client.query(sql);
      console.log("Migration applied:", migrationPath);
    }
    await verifyPostMigration(client, admin);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

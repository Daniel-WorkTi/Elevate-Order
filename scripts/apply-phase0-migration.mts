/**
 * Apply Phase 0 SQL migration against the linked Supabase Postgres.
 *
 * Requires one of:
 * - DATABASE_URL / SUPABASE_DB_URL / DIRECT_URL
 * - SUPABASE_DB_PASSWORD (+ project ref from SUPABASE_PROJECT_ID)
 *
 * Usage: npx tsx scripts/apply-phase0-migration.mts
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

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

loadEnv(".env");
loadEnv(".env.local");

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

async function main() {
  const sqlPath = "supabase/migrations/20260827190000_workspaces_multitenant.sql";
  const sql = readFileSync(sqlPath, "utf8");
  const dbUrl = resolveDbUrl();

  if (!dbUrl) {
    console.error(
      JSON.stringify({
        ok: false,
        reason: "missing_database_url",
        hint: "Set DATABASE_URL or SUPABASE_DB_PASSWORD to apply DDL. Migration file is ready at " + sqlPath,
      }),
    );
    process.exit(2);
  }

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log(JSON.stringify({ ok: true, applied: sqlPath }));
  } finally {
    await client.end();
  }

  // Post-apply report via service role
  const url = (process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "").trim();
  const key = (process.env["SUPABASE_SERVICE_ROLE_KEY"] || "").trim();
  if (!url || !key) return;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: report, error } = await supabase
    .from("phase0_migration_report")
    .select("kind, workspace_id, details");
  if (error) {
    console.error("report_read_failed", error.message);
    return;
  }
  const counts: Record<string, number> = {};
  for (const row of report ?? []) {
    counts[row.kind] = (counts[row.kind] ?? 0) + 1;
  }
  console.log(JSON.stringify({ reportCounts: counts, rows: report?.length ?? 0 }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

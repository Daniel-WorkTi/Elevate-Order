/**
 * FULL production preflight for 20260920190000_orders_workspace_scoped_identity.sql
 * Read-only. No sample/limit truncation on duplicate detection.
 *
 * Usage: npx tsx scripts/p0-orders-workspace-identity-preflight.mts
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"));

function resolveDbUrl(): string | null {
  const direct =
    process.env["DATABASE_URL"]?.trim() ||
    process.env["SUPABASE_DB_URL"]?.trim() ||
    process.env["DIRECT_URL"]?.trim() ||
    process.env["POSTGRES_URL"]?.trim();
  if (direct) return direct;

  const password = process.env["SUPABASE_DB_PASSWORD"]?.trim();
  const url = process.env["SUPABASE_URL"]?.trim() || "";
  const refFromUrl = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
  const ref =
    process.env["SUPABASE_PROJECT_ID"]?.trim() ||
    process.env["VITE_SUPABASE_PROJECT_ID"]?.trim() ||
    refFromUrl;
  if (password && ref) {
    const encoded = encodeURIComponent(password);
    return `postgresql://postgres.${ref}:${encoded}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
  }
  return null;
}

async function pgMetaQuery<T = unknown>(
  supabaseUrl: string,
  serviceKey: string,
  sql: string,
): Promise<{ ok: true; rows: T[] } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/pg-meta/default/query`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `pg-meta HTTP ${res.status}: ${text.slice(0, 400)}` };
    }
    const parsed = JSON.parse(text) as T[] | { error?: string };
    if (parsed && !Array.isArray(parsed) && typeof parsed === "object" && "error" in parsed) {
      return { ok: false, error: String(parsed.error) };
    }
    return { ok: true, rows: parsed as T[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

type OrderKeyRow = { workspace_id: string | null; order_id: number };

async function fetchAllOrderKeys(
  supabase: ReturnType<typeof createClient>,
): Promise<{ rows: OrderKeyRow[]; error?: string }> {
  const pageSize = 1000;
  const rows: OrderKeyRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("orders")
      .select("workspace_id, order_id")
      .order("id", { ascending: true })
      .range(from, to);
    if (error) return { rows, error: error.message };
    const batch = (data ?? []) as OrderKeyRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return { rows };
}

function countCompositeDupes(rows: OrderKeyRow[]): {
  groups: number;
  examples: Array<{ workspace_id: string; order_id: number; count: number }>;
} {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.workspace_id == null) continue;
    const key = `${r.workspace_id}::${r.order_id}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const examples: Array<{ workspace_id: string; order_id: number; count: number }> = [];
  let groups = 0;
  for (const [key, count] of map) {
    if (count <= 1) continue;
    groups += 1;
    if (examples.length < 10) {
      const [workspace_id, order_id] = key.split("::");
      examples.push({
        workspace_id: workspace_id!,
        order_id: Number(order_id),
        count,
      });
    }
  }
  return { groups, examples };
}

async function main() {
  const url = process.env["SUPABASE_URL"]?.trim();
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
  if (!url || !key) {
    console.error("FAIL: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
    process.exit(2);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("=== P0 FULL PREFLIGHT (read-only) ===\n");

  const ordersTotal = await supabase.from("orders").select("*", { count: "exact", head: true });
  const ordersNull = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .is("workspace_id", null);
  const eventsTotal = await supabase
    .from("order_events")
    .select("*", { count: "exact", head: true });
  const eventsNull = await supabase
    .from("order_events")
    .select("*", { count: "exact", head: true })
    .is("workspace_id", null);

  console.log(`A. TOTAL ORDERS: ${ordersTotal.count ?? "?"}`);
  if (ordersTotal.error) console.log(`   error: ${ordersTotal.error.message}`);
  console.log(`B. ORDERS workspace_id NULL: ${ordersNull.count ?? "?"}`);
  if (ordersNull.error) console.log(`   error: ${ordersNull.error.message}`);
  console.log(`   order_events total: ${eventsTotal.count ?? "?"}`);
  console.log(`   order_events workspace_id NULL: ${eventsNull.count ?? "?"}`);

  console.log("\nC. FULL SCAN composite duplicates (workspace_id IS NOT NULL)...");
  const { rows, error: fetchErr } = await fetchAllOrderKeys(supabase);
  if (fetchErr) {
    console.log(`FAIL fetch order keys: ${fetchErr}`);
    process.exit(1);
  }
  console.log(`   rows scanned: ${rows.length} (complete, no sample cap)`);
  if ((ordersTotal.count ?? 0) !== rows.length) {
    console.log(
      `   WARN: count head=${ordersTotal.count} vs scanned=${rows.length} — investigate if mismatch`,
    );
  }
  const dupes = countCompositeDupes(rows);
  console.log(`   NON-NULL COMPOSITE DUPLICATE GROUPS: ${dupes.groups}`);
  if (dupes.examples.length) {
    console.log(`   examples: ${JSON.stringify(dupes.examples)}`);
  }

  // Schema / constraints via Postgres if available, else pg-meta
  const schemaSql = `
SELECT
  'constraint' AS kind,
  c.conname AS name,
  pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN ('orders', 'order_events')
  AND c.contype IN ('u', 'p', 'f')
UNION ALL
SELECT
  'index' AS kind,
  i.relname AS name,
  pg_get_indexdef(i.oid) AS definition
FROM pg_index x
JOIN pg_class i ON i.oid = x.indexrelid
JOIN pg_class t ON t.oid = x.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN ('orders', 'order_events')
ORDER BY kind, name;
`;

  const depsSql = `
SELECT
  dependent_ns.nspname AS dependent_schema,
  dependent_view.relname AS dependent_name,
  dependent_view.relkind AS relkind,
  source_ns.nspname AS source_schema,
  source_table.relname AS source_table
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
WHERE source_ns.nspname = 'public'
  AND source_table.relname IN ('orders', 'order_events')
  AND dependent_view.relname <> source_table.relname
ORDER BY 1, 2;
`;

  const fkSql = `
SELECT
  con.conname,
  rel.relname AS from_table,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace n ON n.oid = rel.relnamespace
WHERE con.contype = 'f'
  AND n.nspname = 'public'
  AND (
    pg_get_constraintdef(con.oid) ILIKE '%orders%'
    OR pg_get_constraintdef(con.oid) ILIKE '%order_events%'
  )
ORDER BY from_table, conname;
`;

  type SchemaRow = { kind: string; name: string; definition: string };
  let schemaRows: SchemaRow[] | null = null;
  let schemaSource = "none";

  const dbUrl = resolveDbUrl();
  if (dbUrl) {
    schemaSource = "postgres";
    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    try {
      const r = await client.query<SchemaRow>(schemaSql);
      schemaRows = r.rows;
      const deps = await client.query(depsSql);
      const fks = await client.query(fkSql);
      console.log("\nD/E/F. SCHEMA (via Postgres)");
      console.log(JSON.stringify(schemaRows, null, 2));
      console.log("\nDependencies (views/rules):");
      console.log(JSON.stringify(deps.rows, null, 2));
      console.log("\nForeign keys mentioning orders/order_events:");
      console.log(JSON.stringify(fks.rows, null, 2));
    } finally {
      await client.end();
    }
  } else {
    const meta = await pgMetaQuery<SchemaRow>(url, key, schemaSql);
    if (meta.ok) {
      schemaSource = "pg-meta";
      schemaRows = meta.rows;
      console.log("\nD/E/F. SCHEMA (via pg-meta)");
      console.log(JSON.stringify(schemaRows, null, 2));
      const deps = await pgMetaQuery(url, key, depsSql);
      const fks = await pgMetaQuery(url, key, fkSql);
      console.log("\nDependencies (views/rules):");
      console.log(JSON.stringify(deps.ok ? deps.rows : deps.error, null, 2));
      console.log("\nForeign keys mentioning orders/order_events:");
      console.log(JSON.stringify(fks.ok ? fks.rows : fks.error, null, 2));
    } else {
      console.log(`\nD/E/F. SCHEMA: UNAVAILABLE (${meta.error})`);
      console.log("   No DATABASE_URL / SUPABASE_DB_PASSWORD and pg-meta failed.");
    }
  }

  const hasGlobalUnique =
    schemaRows?.some(
      (r) =>
        r.name === "orders_order_id_key" ||
        /UNIQUE\s*\(\s*order_id\s*\)/i.test(r.definition ?? "") ||
        /CREATE UNIQUE INDEX.*\border_id\b(?!.*workspace_id)/i.test(r.definition ?? ""),
    ) ?? null;
  const hasWorkspaceUnique =
    schemaRows?.some(
      (r) =>
        r.name === "orders_workspace_order_id_uidx" ||
        /\(workspace_id,\s*order_id\)/i.test(r.definition ?? ""),
    ) ?? null;

  console.log("\nG. NULL workspace coexistence:");
  console.log(
    "   Partial unique index WHERE workspace_id IS NOT NULL leaves 49 NULL rows untouched.",
  );
  console.log("   Migration does not assign/delete them.");

  console.log("\n=== PREFLIGHT SUMMARY ===");
  console.log(`schema_source: ${schemaSource}`);
  console.log(`orders_order_id_key present: ${hasGlobalUnique}`);
  console.log(`orders_workspace_order_id_uidx present: ${hasWorkspaceUnique}`);
  console.log(`composite_dupes: ${dupes.groups}`);

  const pass =
    dupes.groups === 0 &&
    rows.length === (ordersTotal.count ?? rows.length) &&
    !ordersTotal.error &&
    !fetchErr;

  if (dupes.groups > 0) {
    console.log("\nFULL PREFLIGHT: FAIL — STOP (composite duplicates exist)");
    process.exit(1);
  }
  if (!pass) {
    console.log("\nFULL PREFLIGHT: FAIL — incomplete scan or count error");
    process.exit(1);
  }

  console.log("\nFULL PREFLIGHT: PASS");
  console.log(
    JSON.stringify(
      {
        totalOrders: ordersTotal.count,
        nullWorkspaceOrders: ordersNull.count,
        compositeDuplicates: dupes.groups,
        rowsScanned: rows.length,
        hasGlobalUnique,
        hasWorkspaceUnique,
        schemaSource,
        dbUrlAvailable: Boolean(dbUrl),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

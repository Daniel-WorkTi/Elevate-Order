import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    let val = m[2] ?? "";
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function classify(value: unknown): "null" | "empty" | "valid_uuid" | "invalid" {
  if (value == null) return "null";
  if (typeof value !== "string") return "invalid";
  const t = value.trim();
  if (!t) return "empty";
  if (UUID_RE.test(t)) return "valid_uuid";
  return "invalid";
}

async function auditTable(
  supabase: ReturnType<typeof createClient>,
  table: string,
  column = "workspace_id",
) {
  const { data, error } = await supabase.from(table).select(column);
  if (error) {
    return { table, error: error.message };
  }
  const counts = { null: 0, empty: 0, valid_uuid: 0, invalid: 0 };
  const invalidSamples: { value: string; count: number }[] = [];
  const invalidMap = new Map<string, number>();
  for (const row of data ?? []) {
    const v = (row as Record<string, unknown>)[column];
    const c = classify(v);
    counts[c] += 1;
    if (c === "invalid" || c === "empty") {
      const key = typeof v === "string" ? v : String(v);
      invalidMap.set(key, (invalidMap.get(key) ?? 0) + 1);
    }
  }
  for (const [value, count] of invalidMap) {
    invalidSamples.push({ value, count });
  }
  return { table, total: data?.length ?? 0, counts, invalidSamples };
}

async function main() {
  const url = (process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "").trim();
  const key = (process.env["SUPABASE_SERVICE_ROLE_KEY"] || "").trim();
  if (!url || !key) {
    console.log(JSON.stringify({ ok: false, reason: "missing_env", hasUrl: !!url, hasKey: !!key }));
    return;
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const tables = ["orders", "order_events", "shopify_stores", "workspace_webhook_endpoints"] as const;
  const results = [];
  for (const t of tables) {
    results.push(await auditTable(supabase, t));
  }

  // Shopify ownership mapping preview
  const { data: stores, error: storesErr } = await supabase
    .from("shopify_stores")
    .select("user_id, workspace_id, shop_domain");

  const byWs = new Map<string, Set<string>>();
  for (const s of stores ?? []) {
    const ws = typeof s.workspace_id === "string" ? s.workspace_id.trim() : "";
    const uid = typeof s.user_id === "string" ? s.user_id : "";
    if (!ws || !UUID_RE.test(ws) || !uid) continue;
    if (!byWs.has(ws)) byWs.set(ws, new Set());
    byWs.get(ws)!.add(uid);
  }
  const conflicts = [...byWs.entries()]
    .filter(([, users]) => users.size > 1)
    .map(([workspace_id, users]) => ({ workspace_id, user_ids: [...users] }));

  console.log(
    JSON.stringify(
      {
        ok: true,
        host: new URL(url).host,
        columnAudits: results,
        shopifyStoresError: storesErr?.message ?? null,
        shopifyStoreRows: stores?.length ?? 0,
        shopifyWorkspaceConflicts: conflicts,
        distinctShopifyWorkspaces: byWs.size,
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

/**
 * READ-ONLY multi-tenant inventory against the configured Supabase project.
 * Never mutates data. Prints counts only (no row payloads / secrets).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
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

const url = process.env["SUPABASE_URL"]?.trim();
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();

if (!url || !key) {
  console.log("PRODUCTION INVENTORY: SKIPPED (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)");
  process.exit(0);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function count(table: string, filter?: (q: ReturnType<typeof supabase.from>) => unknown) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q as never) as typeof q;
  const { count: n, error } = await q;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, count: n ?? 0 };
}

function classify(label: string, n: number | null, note: string) {
  console.log(`- ${label}: ${n ?? "?"} (${note})`);
}

console.log("=== READ-ONLY multi-tenant inventory ===\n");

const ordersTotal = await count("orders");
const ordersNull = await count("orders", (q) =>
  (q as { is: (c: string, v: null) => unknown }).is("workspace_id", null),
);
const eventsTotal = await count("order_events");
const eventsNull = await count("order_events", (q) =>
  (q as { is: (c: string, v: null) => unknown }).is("workspace_id", null),
);
const workspaces = await count("workspaces");
const orphanWs = await count("workspaces", (q) =>
  (q as { is: (c: string, v: null) => unknown }).is("owner_user_id", null),
);
const shopify = await count("shopify_stores");
const shopifyNullWs = await count("shopify_stores", (q) =>
  (q as { is: (c: string, v: null) => unknown }).is("workspace_id", null),
);
const webhooks = await count("workspace_webhook_endpoints");
const dropeaCreds = await count("workspace_provider_credentials");
const waConnections = await count("whatsapp_connections");

classify("orders total", ordersTotal.ok ? ordersTotal.count : null, ordersTotal.ok ? "REAL/UNKNOWN mix" : ordersTotal.error);
classify(
  "orders workspace_id NULL",
  ordersNull.ok ? ordersNull.count : null,
  ordersNull.ok ? (ordersNull.count > 0 ? "ORPHANED / SHOULD REVIEW" : "none") : ordersNull.error,
);
classify("order_events total", eventsTotal.ok ? eventsTotal.count : null, "REAL/UNKNOWN");
classify(
  "order_events workspace_id NULL",
  eventsNull.ok ? eventsNull.count : null,
  eventsNull.ok ? (eventsNull.count > 0 ? "ORPHANED / SHOULD REVIEW" : "none") : eventsNull.error,
);
classify("workspaces", workspaces.ok ? workspaces.count : null, "REAL/UNKNOWN");
classify(
  "workspaces owner_user_id NULL",
  orphanWs.ok ? orphanWs.count : null,
  orphanWs.ok ? (orphanWs.count > 0 ? "ORPHANED" : "none") : orphanWs.error,
);
classify("shopify_stores", shopify.ok ? shopify.count : null, "REAL/TEST/UNKNOWN");
classify(
  "shopify_stores workspace_id NULL",
  shopifyNullWs.ok ? shopifyNullWs.count : null,
  shopifyNullWs.ok ? (shopifyNullWs.count > 0 ? "ORPHANED" : "none") : shopifyNullWs.error,
);
classify("workspace_webhook_endpoints", webhooks.ok ? webhooks.count : null, "REAL/TEST/UNKNOWN");
classify("workspace_provider_credentials", dropeaCreds.ok ? dropeaCreds.count : null, "REAL/TEST/UNKNOWN");
classify("whatsapp_connections", waConnections.ok ? waConnections.count : null, "REAL/TEST/UNKNOWN");

// Composite duplicate probe (non-null workspace only)
const { data: sample, error: sampleError } = await supabase
  .from("orders")
  .select("workspace_id, order_id")
  .not("workspace_id", "is", null)
  .limit(5000);

if (sampleError) {
  console.log(`\nComposite probe: ERROR ${sampleError.message}`);
} else {
  const keyCounts = new Map<string, number>();
  for (const row of sample ?? []) {
    const key = `${row.workspace_id}:${row.order_id}`;
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }
  const dupes = [...keyCounts.values()].filter((n) => n > 1).length;
  console.log(
    `\nComposite (workspace_id, order_id) duplicates in sample≤5000: ${dupes} ${dupes === 0 ? "(SAFE TO MIGRATE if full scan matches)" : "(STOP — reconcile)"}`,
  );
}

console.log("\nSAFE TO CLEAN TEST DATA: NO (inventory only — no deletes in this task)");
console.log("=== end inventory ===");

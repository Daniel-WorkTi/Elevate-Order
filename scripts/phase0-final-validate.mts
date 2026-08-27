import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq);
    let v = t.slice(eq + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(".env");
loadEnv(".env.local");

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function openApiFormats() {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/openapi+json",
    },
  });
  const schema = await res.json();
  const defs = schema.definitions || {};
  const tables = [
    "orders",
    "order_events",
    "shopify_stores",
    "workspace_webhook_endpoints",
    "message_templates",
    "workspaces",
    "phase0_migration_report",
  ];
  console.log("\n=== OpenAPI column formats ===");
  for (const t of tables) {
    const props = defs[t]?.properties || {};
    const keys = Object.keys(props).sort();
    console.log(
      t,
      keys.includes("workspace_id")
        ? `workspace_id=${props.workspace_id?.format || props.workspace_id?.type}`
        : "no workspace_id",
      keys.includes("language") ? "HAS language" : "no language",
      keys.includes("owner_user_id")
        ? `owner=${props.owner_user_id?.format || props.owner_user_id?.type}`
        : "",
    );
  }
}

async function workspacesSummary() {
  console.log("\n=== workspaces ===");
  const { data, error } = await admin
    .from("workspaces")
    .select("id, name, owner_user_id, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("workspaces error", error.message);
    return;
  }
  const rows = data || [];
  const claimed = rows.filter((w) => w.owner_user_id);
  const orphan = rows.filter((w) => !w.owner_user_id);
  console.log(
    JSON.stringify(
      {
        total: rows.length,
        claimed: claimed.length,
        orphan: orphan.length,
        claimed_ids: claimed.map((w) => ({
          id: w.id,
          name: w.name,
          owner_suffix: String(w.owner_user_id).slice(-8),
        })),
        orphan_ids: orphan.map((w) => ({ id: w.id, name: w.name })),
      },
      null,
      2,
    ),
  );
}

async function shopifyBinding() {
  console.log("\n=== shopify_stores (no tokens) ===");
  const { data, error } = await admin
    .from("shopify_stores")
    .select("id, shop_domain, user_id, workspace_id, uninstalled_at, installed_at")
    .order("installed_at", { ascending: false });
  if (error) {
    console.error(error.message);
    return;
  }
  for (const s of data || []) {
    console.log(
      JSON.stringify({
        shop_domain: s.shop_domain,
        uninstalled: Boolean(s.uninstalled_at),
        user_suffix: String(s.user_id).slice(-8),
        workspace_id: s.workspace_id,
        user_owns_workspace: null as boolean | null,
      }),
    );
  }

  // ownership check without printing full user ids beyond suffix already shown
  for (const s of data || []) {
    if (!s.workspace_id) continue;
    const { data: ws } = await admin
      .from("workspaces")
      .select("owner_user_id")
      .eq("id", s.workspace_id)
      .maybeSingle();
    console.log(
      `bind ${s.shop_domain}: workspace=${s.workspace_id} owner_match=${
        ws?.owner_user_id === s.user_id
      } orphan=${ws?.owner_user_id == null}`,
    );
  }
}

async function phase0Report() {
  console.log("\n=== phase0_migration_report kinds ===");
  const { data, error } = await admin
    .from("phase0_migration_report")
    .select("kind, workspace_id, details");
  if (error) {
    console.error(error.message);
    return;
  }
  const counts: Record<string, number> = {};
  for (const r of data || []) {
    counts[r.kind] = (counts[r.kind] || 0) + 1;
  }
  console.log(JSON.stringify(counts, null, 2));
  const conflicts = (data || []).filter((r) => r.kind === "shopify_owner_conflict");
  console.log("shopify_owner_conflict rows:", conflicts.length);
  for (const c of conflicts) {
    console.log(
      JSON.stringify({
        workspace_id: c.workspace_id,
        shop_domain: (c.details as { shop_domain?: string } | null)?.shop_domain,
      }),
    );
  }
}

async function countsByWorkspace() {
  console.log("\n=== row counts by workspace (orders) ===");
  const { data, error } = await admin.from("orders").select("workspace_id");
  if (error) {
    console.error(error.message);
    return;
  }
  const map = new Map<string, number>();
  for (const r of data || []) {
    const k = r.workspace_id ?? "NULL";
    map.set(k, (map.get(k) || 0) + 1);
  }
  console.log(
    JSON.stringify(
      [...map.entries()].map(([workspace_id, count]) => ({ workspace_id, count })),
      null,
      2,
    ),
  );
}

async function rlsProbe() {
  console.log("\n=== RLS probe (anon key, no session) ===");
  const anon =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (!anon) {
    console.log("no anon key");
    return;
  }
  const client = createClient(url, anon, { auth: { persistSession: false } });
  for (const table of ["workspaces", "orders", "order_events", "message_templates"] as const) {
    const { data, error } = await client.from(table).select("*").limit(3);
    console.log(
      table,
      error
        ? `error=${error.message}`
        : `rows=${(data || []).length} (expect 0 without auth except maybe system templates)`,
    );
  }
}

await openApiFormats();
await workspacesSummary();
await shopifyBinding();
await phase0Report();
await countsByWorkspace();
await rlsProbe();

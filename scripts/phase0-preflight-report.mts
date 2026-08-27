import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const url = (process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "").trim();
const key = (process.env["SUPABASE_SERVICE_ROLE_KEY"] || "").trim();
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function idsFrom(table: string) {
  const { data } = await supabase.from(table).select("workspace_id");
  return new Set(
    (data ?? [])
      .map((r) => (typeof r.workspace_id === "string" ? r.workspace_id.trim() : ""))
      .filter((id) => UUID_RE.test(id)),
  );
}

const [orders, events, webhooks, stores] = await Promise.all([
  idsFrom("orders"),
  idsFrom("order_events"),
  idsFrom("workspace_webhook_endpoints"),
  supabase.from("shopify_stores").select("user_id, workspace_id, shop_domain"),
]);

const all = new Set([...orders, ...events, ...webhooks]);
const claimable = new Map<string, string>();
const conflicts: unknown[] = [];
for (const s of stores.data ?? []) {
  const ws = typeof s.workspace_id === "string" ? s.workspace_id.trim() : "";
  const uid = typeof s.user_id === "string" ? s.user_id : "";
  if (!UUID_RE.test(ws) || !uid) continue;
  all.add(ws);
  const prev = claimable.get(ws);
  if (!prev) claimable.set(ws, uid);
  else if (prev !== uid) conflicts.push({ workspace_id: ws, users: [prev, uid] });
}

const { error: wsErr } = await supabase.from("workspaces").select("id").limit(1);

console.log(
  JSON.stringify(
    {
      workspacesTableExists: !wsErr,
      workspacesTableError: wsErr?.message ?? null,
      distinctWorkspaceIds: all.size,
      shopifyClaimable: claimable.size,
      orphansIfMigrated: all.size - claimable.size,
      conflicts,
      invalidNonNull: 0,
    },
    null,
    2,
  ),
);

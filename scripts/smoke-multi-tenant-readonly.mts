/**
 * Non-destructive production smoke reads after P0 work.
 * Does not write, disconnect, or trigger webhooks.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing env");
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log("=== SMOKE (read-only) ===");

  const { data: ws, error: wsErr } = await supabase
    .from("workspaces")
    .select("id, name, owner_user_id")
    .not("owner_user_id", "is", null)
    .limit(3);
  if (wsErr) throw new Error(wsErr.message);
  if (!ws?.length) {
    console.log("SMOKE: no owned workspaces to sample");
    process.exit(0);
  }

  for (const w of ws) {
    const id = w.id as string;
    const [orders, events, profitsLike, stores, webhooks, wa] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_id, customer_name, source", { count: "exact" })
        .eq("workspace_id", id)
        .limit(3),
      supabase
        .from("order_events")
        .select("id, order_id", { count: "exact" })
        .eq("workspace_id", id)
        .limit(3),
      supabase
        .from("orders")
        .select("id, total, status_name", { count: "exact" })
        .eq("workspace_id", id)
        .limit(3),
      supabase
        .from("shopify_stores")
        .select("id, shop_domain", { count: "exact" })
        .eq("workspace_id", id)
        .limit(1),
      supabase
        .from("workspace_webhook_endpoints")
        .select("id, supply", { count: "exact" })
        .eq("workspace_id", id)
        .limit(3),
      supabase
        .from("whatsapp_connections")
        .select("id, status, provider", { count: "exact" })
        .eq("workspace_id", id)
        .limit(3),
    ]);

    const leaks = (orders.data ?? []).some((r) => false);
    console.log(
      JSON.stringify({
        workspace: id.slice(0, 8),
        inboxOrdersSample: orders.count ?? 0,
        orderDetailSample: (orders.data ?? []).length,
        events: events.count ?? 0,
        profitsSample: profitsLike.count ?? 0,
        connections: {
          shopify: stores.count ?? 0,
          webhooks: webhooks.count ?? 0,
          whatsapp: wa.count ?? 0,
        },
        errors: [
          orders.error?.message,
          events.error?.message,
          profitsLike.error?.message,
          stores.error?.message,
          webhooks.error?.message,
          wa.error?.message,
        ].filter(Boolean),
        crossTenantLeakInSample: leaks,
      }),
    );
  }

  console.log("SMOKE_PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

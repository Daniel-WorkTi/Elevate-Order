/**
 * READ-ONLY orphan classification for NULL-workspace orders and ownerless workspaces.
 * Never mutates. Never auto-assigns ownership.
 *
 * Usage: npx tsx scripts/classify-orphan-tenants-readonly.mts
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

const url = process.env["SUPABASE_URL"]?.trim();
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Class = "RELIABLY ATTRIBUTABLE" | "TEST/DEMO" | "UNKNOWN";

function isTestish(text: string | null | undefined): boolean {
  if (!text) return false;
  return /\b(test|demo|sample|fake|lorem|asdf|xxx|example)\b/i.test(text);
}

async function main() {
  console.log("=== ORPHAN CLASSIFICATION (read-only) ===\n");

  // ---- orders with NULL workspace ----
  const { data: nullOrders, error: oErr } = await supabase
    .from("orders")
    .select(
      "id, order_id, shopify_order_id, source, customer_name, phone, email, created_at, updated_at, last_event_at",
    )
    .is("workspace_id", null)
    .order("created_at", { ascending: true });
  if (oErr) throw new Error(oErr.message);

  const orderIds = (nullOrders ?? []).map((o) => o.order_id as number);
  const { data: events } = orderIds.length
    ? await supabase
        .from("order_events")
        .select("order_id, workspace_id, source, created_at")
        .in("order_id", orderIds)
    : { data: [] as Array<{ order_id: number; workspace_id: string | null; source: string | null }> };

  const eventsByOrder = new Map<number, Array<{ workspace_id: string | null; source: string | null }>>();
  for (const e of events ?? []) {
    const list = eventsByOrder.get(e.order_id as number) ?? [];
    list.push({ workspace_id: e.workspace_id as string | null, source: e.source as string | null });
    eventsByOrder.set(e.order_id as number, list);
  }

  // Shopify store linkage: only reliable if shopify_order_id maps to a store-scoped order
  // that already has workspace — we check if any NON-null twin exists with same shopify_order_id.
  const shopifyIds = (nullOrders ?? [])
    .map((o) => o.shopify_order_id as number | null)
    .filter((v): v is number => typeof v === "number");
  const { data: shopifyTwins } = shopifyIds.length
    ? await supabase
        .from("orders")
        .select("shopify_order_id, workspace_id")
        .in("shopify_order_id", shopifyIds)
        .not("workspace_id", "is", null)
    : { data: [] as Array<{ shopify_order_id: number; workspace_id: string }> };

  const twinWsByShopify = new Map<number, Set<string>>();
  for (const t of shopifyTwins ?? []) {
    const sid = t.shopify_order_id as number;
    const set = twinWsByShopify.get(sid) ?? new Set();
    set.add(String(t.workspace_id));
    twinWsByShopify.set(sid, set);
  }

  let attributable = 0;
  let testDemo = 0;
  let unknown = 0;
  const attributableReasons: string[] = [];
  const testReasons: string[] = [];

  for (const o of nullOrders ?? []) {
    const oid = o.order_id as number;
    const evs = eventsByOrder.get(oid) ?? [];
    const eventWorkspaces = [
      ...new Set(evs.map((e) => e.workspace_id).filter((w): w is string => Boolean(w))),
    ];

    // Reliable: ALL related events share exactly one non-null workspace_id
    if (eventWorkspaces.length === 1 && evs.every((e) => e.workspace_id === eventWorkspaces[0])) {
      attributable += 1;
      if (attributableReasons.length < 15) {
        attributableReasons.push(
          `order_id=${oid} via unanimous order_events.workspace_id=${eventWorkspaces[0]}`,
        );
      }
      continue;
    }

    // Reliable: shopify twin with exactly one workspace
    const sid = o.shopify_order_id as number | null;
    if (sid != null) {
      const twins = twinWsByShopify.get(sid);
      if (twins && twins.size === 1) {
        attributable += 1;
        if (attributableReasons.length < 15) {
          attributableReasons.push(
            `order_id=${oid} via unique shopify twin workspace=${[...twins][0]}`,
          );
        }
        continue;
      }
    }

    if (
      isTestish(o.customer_name as string | null) ||
      isTestish(o.email as string | null) ||
      isTestish(o.source as string | null) ||
      isTestish(o.phone as string | null)
    ) {
      testDemo += 1;
      if (testReasons.length < 15) {
        testReasons.push(`order_id=${oid} testish fields`);
      }
      continue;
    }

    unknown += 1;
  }

  console.log("NULL-WORKSPACE ORDERS");
  console.log(`  total: ${(nullOrders ?? []).length}`);
  console.log(`  RELIABLY ATTRIBUTABLE: ${attributable}`);
  console.log(`  TEST/DEMO: ${testDemo}`);
  console.log(`  UNKNOWN: ${unknown}`);
  if (attributableReasons.length) {
    console.log("  attributable samples:");
    for (const r of attributableReasons) console.log(`    - ${r}`);
  }
  if (testReasons.length) {
    console.log("  test/demo samples:");
    for (const r of testReasons) console.log(`    - ${r}`);
  }

  // ---- ownerless workspaces ----
  const { data: orphanWs, error: wErr } = await supabase
    .from("workspaces")
    .select("id, name, owner_user_id, created_at")
    .is("owner_user_id", null);
  if (wErr) throw new Error(wErr.message);

  let wsAttr = 0;
  let wsTest = 0;
  let wsUnknown = 0;

  for (const ws of orphanWs ?? []) {
    const wsId = String(ws.id);

    // Reliable signals: memberships / integrations bound to this workspace with a user
    const [{ data: members }, { count: orderCount }, { count: webhookCount }, { count: storeCount }, { count: waCount }] =
      await Promise.all([
        supabase
          .from("workspace_members")
          .select("user_id, role")
          .eq("workspace_id", wsId)
          .limit(5),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", wsId),
        supabase
          .from("workspace_webhook_endpoints")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", wsId),
        supabase
          .from("shopify_stores")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", wsId),
        supabase
          .from("whatsapp_connections")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", wsId),
      ]);

    const memberUsers = (members ?? [])
      .map((m) => m.user_id as string | null)
      .filter((u): u is string => Boolean(u));

    if (memberUsers.length === 1) {
      // Single member is a reliable ownership signal for later reconciliation
      wsAttr += 1;
      continue;
    }

    if (
      isTestish(ws.name as string | null) ||
      ((orderCount ?? 0) === 0 &&
        (webhookCount ?? 0) === 0 &&
        (storeCount ?? 0) === 0 &&
        (waCount ?? 0) === 0 &&
        memberUsers.length === 0)
    ) {
      // Empty shell with no owner/members/integrations → TEST/DEMO only if name suggests;
      // otherwise UNKNOWN (do not over-classify empty as demo).
      if (isTestish(ws.name as string | null)) {
        wsTest += 1;
      } else {
        wsUnknown += 1;
      }
      continue;
    }

    wsUnknown += 1;
  }

  console.log("\nOWNERLESS WORKSPACES");
  console.log(`  total: ${(orphanWs ?? []).length}`);
  console.log(`  RELIABLY ATTRIBUTABLE: ${wsAttr}`);
  console.log(`  TEST/DEMO: ${wsTest}`);
  console.log(`  UNKNOWN: ${wsUnknown}`);

  console.log("\n=== end classification (no writes) ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

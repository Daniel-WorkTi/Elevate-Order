/**
 * READ-ONLY production launch inventory + classification.
 * Never mutates. Never prints secrets/tokens.
 *
 * Usage: npx tsx scripts/launch-readiness-inventory-readonly.mts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const supabase: SupabaseClient = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Class = "REAL" | "TEST_DEMO" | "ORPHANED" | "UNKNOWN";

function isStrongTestName(text: string | null | undefined): boolean {
  if (!text) return false;
  return (
    /\b(test|demo|dev|sandbox|staging|fixture|sample|lorem|asdf|xxx|example|fake)\b/i.test(
      text,
    ) ||
    /phase\d+[-_]/i.test(text) ||
    /cod-gate/i.test(text) ||
    /-orphan\b/i.test(text)
  );
}

function isFakeCustomer(name: string | null | undefined, email: string | null | undefined): boolean {
  const blob = `${name ?? ""} ${email ?? ""}`.toLowerCase();
  if (!blob.trim()) return false;
  return (
    /\b(test|demo|fake|sample|lorem|asdf|john doe|jane doe|foo bar)\b/.test(blob) ||
    /@(example\.com|test\.com|mailinator\.com|localhost)\b/.test(blob)
  );
}

async function countExact(
  table: string,
  filter?: (q: ReturnType<SupabaseClient["from"]>) => unknown,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q as never) as typeof q;
  const { count, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, count: count ?? 0 };
}

async function paginateSelect<T extends Record<string, unknown>>(
  table: string,
  columns: string,
  pageSize = 1000,
  orderCol = "created_at",
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    let q = supabase.from(table).select(columns).range(from, to);
    // Some tables may lack created_at — fall back silently
    try {
      q = q.order(orderCol, { ascending: true });
    } catch {
      /* ignore */
    }
    const { data, error } = await q;
    if (error) {
      // retry without order
      const retry = await supabase.from(table).select(columns).range(from, to);
      if (retry.error) throw new Error(`${table}: ${retry.error.message}`);
      const batch = (retry.data ?? []) as T[];
      rows.push(...batch);
      if (batch.length < pageSize) break;
      continue;
    }
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

type WorkspaceRow = {
  id: string;
  name: string | null;
  owner_user_id: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

type DepCounts = {
  orders: number;
  events: number;
  confirmations: number;
  shopify: number;
  webhooks: number;
  dropea: number;
  waConnections: number;
  waSessions: number;
  waConversations: number;
  waMessages: number;
  templates: number;
};

async function depsForWorkspace(wsId: string): Promise<DepCounts> {
  const [
    orders,
    events,
    confirmations,
    shopify,
    webhooks,
    dropea,
    waConnections,
    templates,
  ] = await Promise.all([
    countExact("orders", (q) => (q as { eq: Function }).eq("workspace_id", wsId)),
    countExact("order_events", (q) => (q as { eq: Function }).eq("workspace_id", wsId)),
    countExact("order_confirmation_events", (q) =>
      (q as { eq: Function }).eq("workspace_id", wsId),
    ),
    countExact("shopify_stores", (q) => (q as { eq: Function }).eq("workspace_id", wsId)),
    countExact("workspace_webhook_endpoints", (q) =>
      (q as { eq: Function }).eq("workspace_id", wsId),
    ),
    countExact("workspace_provider_credentials", (q) =>
      (q as { eq: Function }).eq("workspace_id", wsId),
    ),
    countExact("whatsapp_connections", (q) => (q as { eq: Function }).eq("workspace_id", wsId)),
    countExact("message_templates", (q) => (q as { eq: Function }).eq("workspace_id", wsId)),
  ]);

  // Sessions/conversations/messages via connection ids
  const { data: conns } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("workspace_id", wsId);
  const connIds = (conns ?? []).map((c) => c.id as string);
  let waSessions = 0;
  let waConversations = 0;
  let waMessages = 0;
  if (connIds.length) {
    const [s, c, m] = await Promise.all([
      countExact("whatsapp_sessions", (q) => (q as { in: Function }).in("connection_id", connIds)),
      countExact("whatsapp_conversations", (q) =>
        (q as { in: Function }).in("connection_id", connIds),
      ),
      countExact("whatsapp_messages", (q) => (q as { in: Function }).in("connection_id", connIds)),
    ]);
    waSessions = s.ok ? s.count : 0;
    waConversations = c.ok ? c.count : 0;
    waMessages = m.ok ? m.count : 0;
  }

  return {
    orders: orders.ok ? orders.count : -1,
    events: events.ok ? events.count : -1,
    confirmations: confirmations.ok ? confirmations.count : -1,
    shopify: shopify.ok ? shopify.count : -1,
    webhooks: webhooks.ok ? webhooks.count : -1,
    dropea: dropea.ok ? dropea.count : -1,
    waConnections: waConnections.ok ? waConnections.count : -1,
    waSessions,
    waConversations,
    waMessages,
    templates: templates.ok ? templates.count : -1,
  };
}

function classifyWorkspace(
  ws: WorkspaceRow,
  deps: DepCounts,
): { classification: Class; evidence: string } {
  if (isStrongTestName(ws.name)) {
    return { classification: "TEST_DEMO", evidence: `name matches strong test pattern: ${ws.name}` };
  }
  if (!ws.owner_user_id) {
    const empty =
      deps.orders === 0 &&
      deps.events === 0 &&
      deps.shopify === 0 &&
      deps.webhooks === 0 &&
      deps.dropea === 0 &&
      deps.waConnections === 0 &&
      deps.templates === 0;
    if (empty && isStrongTestName(ws.name)) {
      return { classification: "TEST_DEMO", evidence: "ownerless + empty + test name" };
    }
    // Ownerless alone is ORPHANED structurally, but content may be REAL/UNKNOWN
    if (empty) {
      return {
        classification: "ORPHANED",
        evidence: "owner_user_id NULL and no dependent tenant records",
      };
    }
    return {
      classification: "UNKNOWN",
      evidence: "owner_user_id NULL with dependent data — preserve until reconciliation",
    };
  }
  // Owned workspace
  if (
    deps.orders + deps.events + deps.shopify + deps.webhooks + deps.waConnections + deps.templates >
    0
  ) {
    return { classification: "REAL", evidence: "has owner_user_id and dependent operational data" };
  }
  return {
    classification: "REAL",
    evidence: "has owner_user_id (empty workspace still a real tenant shell)",
  };
}

async function main() {
  console.log("=== LAUNCH READINESS INVENTORY (read-only) ===\n");

  // Auth users via admin API
  let authUserCount = 0;
  const authEmails: string[] = [];
  try {
    let page = 1;
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const users = data.users ?? [];
      authUserCount += users.length;
      for (const u of users) {
        if (u.email && isStrongTestName(u.email)) authEmails.push(u.email);
      }
      if (users.length < 200) break;
      page += 1;
    }
  } catch (e) {
    console.log(`auth users: UNAVAILABLE (${e instanceof Error ? e.message : String(e)})`);
  }
  console.log(`AUTH USERS: ${authUserCount}`);
  if (authEmails.length) console.log(`  testish emails (count only): ${authEmails.length}`);

  const tables = [
    "workspaces",
    "orders",
    "order_events",
    "order_confirmation_events",
    "shopify_stores",
    "workspace_webhook_endpoints",
    "workspace_provider_credentials",
    "whatsapp_connections",
    "whatsapp_sessions",
    "whatsapp_session_keys",
    "whatsapp_conversations",
    "whatsapp_messages",
    "whatsapp_connection_secrets",
    "message_templates",
  ] as const;

  console.log("\nTABLE COUNTS");
  const tableCounts: Record<string, number | string> = {};
  for (const t of tables) {
    const r = await countExact(t);
    tableCounts[t] = r.ok ? r.count : `ERR:${r.error}`;
    console.log(`  ${t}: ${tableCounts[t]}`);
  }

  // Workspaces full
  const workspaces = await paginateSelect<WorkspaceRow>(
    "workspaces",
    "id, name, owner_user_id, created_at, updated_at",
  );

  const wsClass: Record<Class, string[]> = {
    REAL: [],
    TEST_DEMO: [],
    ORPHANED: [],
    UNKNOWN: [],
  };
  const wsDetails: Array<{
    id: string;
    name: string | null;
    owner_user_id: string | null;
    created_at: string | null;
    classification: Class;
    evidence: string;
    deps: DepCounts;
  }> = [];

  for (const ws of workspaces) {
    const deps = await depsForWorkspace(ws.id);
    const { classification, evidence } = classifyWorkspace(ws, deps);
    wsClass[classification].push(ws.id);
    wsDetails.push({
      id: ws.id,
      name: ws.name,
      owner_user_id: ws.owner_user_id,
      created_at: ws.created_at,
      classification,
      evidence,
      deps,
    });
  }

  console.log("\nWORKSPACES BY CLASS");
  for (const c of ["REAL", "TEST_DEMO", "ORPHANED", "UNKNOWN"] as Class[]) {
    console.log(`  ${c}: ${wsClass[c].length}`);
  }

  // Ownerless detail
  console.log("\nOWNERLESS WORKSPACES");
  for (const w of wsDetails.filter((x) => !x.owner_user_id)) {
    console.log(
      JSON.stringify({
        id: w.id,
        name: w.name,
        created_at: w.created_at,
        classification: w.classification,
        evidence: w.evidence,
        deps: w.deps,
      }),
    );
  }

  // Orders classification
  const orders = await paginateSelect<{
    id: string;
    order_id: number;
    workspace_id: string | null;
    source: string | null;
    customer_name: string | null;
    email: string | null;
    phone: string | null;
    shopify_order_id: number | null;
    created_at: string | null;
  }>("orders", "id, order_id, workspace_id, source, customer_name, email, phone, shopify_order_id, created_at");

  const orderClass = { REAL: 0, TEST_DEMO: 0, ORPHANED: 0, UNKNOWN: 0 };
  const nullOrders = orders.filter((o) => o.workspace_id == null);
  console.log(`\nORDERS total=${orders.length} null_workspace=${nullOrders.length}`);

  // Build event workspace map for null orders
  const nullOrderIds = nullOrders.map((o) => o.order_id);
  const eventWsByOrder = new Map<number, Set<string>>();
  if (nullOrderIds.length) {
    // chunk in
    for (let i = 0; i < nullOrderIds.length; i += 100) {
      const chunk = nullOrderIds.slice(i, i + 100);
      const { data: evs } = await supabase
        .from("order_events")
        .select("order_id, workspace_id")
        .in("order_id", chunk);
      for (const e of evs ?? []) {
        const oid = e.order_id as number;
        const set = eventWsByOrder.get(oid) ?? new Set();
        if (e.workspace_id) set.add(String(e.workspace_id));
        eventWsByOrder.set(oid, set);
      }
    }
  }

  // Shopify twin map
  const shopifyIds = nullOrders
    .map((o) => o.shopify_order_id)
    .filter((v): v is number => typeof v === "number");
  const twinWs = new Map<number, Set<string>>();
  if (shopifyIds.length) {
    const { data: twins } = await supabase
      .from("orders")
      .select("shopify_order_id, workspace_id")
      .in("shopify_order_id", shopifyIds)
      .not("workspace_id", "is", null);
    for (const t of twins ?? []) {
      const sid = t.shopify_order_id as number;
      const set = twinWs.get(sid) ?? new Set();
      set.add(String(t.workspace_id));
      twinWs.set(sid, set);
    }
  }

  type NullClass = {
    order_id: number;
    id: string;
    class: "RELIABLY_ATTRIBUTABLE" | "TEST_DEMO" | "UNKNOWN";
    proposed_workspace?: string;
    evidence: string;
  };
  const nullClassified: NullClass[] = [];
  let nullAttr = 0;
  let nullTest = 0;
  let nullUnk = 0;

  for (const o of nullOrders) {
    const evSet = eventWsByOrder.get(o.order_id) ?? new Set();
    if (evSet.size === 1) {
      const ws = [...evSet][0]!;
      nullAttr += 1;
      nullClassified.push({
        order_id: o.order_id,
        id: o.id,
        class: "RELIABLY_ATTRIBUTABLE",
        proposed_workspace: ws,
        evidence: `all related order_events.workspace_id=${ws}`,
      });
      continue;
    }
    if (o.shopify_order_id != null) {
      const twins = twinWs.get(o.shopify_order_id);
      if (twins && twins.size === 1) {
        const ws = [...twins][0]!;
        nullAttr += 1;
        nullClassified.push({
          order_id: o.order_id,
          id: o.id,
          class: "RELIABLY_ATTRIBUTABLE",
          proposed_workspace: ws,
          evidence: `unique shopify_order_id twin in workspace ${ws}`,
        });
        continue;
      }
    }
    if (isFakeCustomer(o.customer_name, o.email) || isStrongTestName(o.source)) {
      nullTest += 1;
      nullClassified.push({
        order_id: o.order_id,
        id: o.id,
        class: "TEST_DEMO",
        evidence: "strong fake/test customer or source pattern",
      });
      continue;
    }
    nullUnk += 1;
    nullClassified.push({
      order_id: o.order_id,
      id: o.id,
      class: "UNKNOWN",
      evidence: "no reliable ownership signal",
    });
  }

  console.log("\nNULL WORKSPACE ORDERS");
  console.log(`  RELIABLY_ATTRIBUTABLE: ${nullAttr}`);
  console.log(`  TEST_DEMO: ${nullTest}`);
  console.log(`  UNKNOWN: ${nullUnk}`);
  for (const row of nullClassified.filter((r) => r.class === "RELIABLY_ATTRIBUTABLE")) {
    console.log(JSON.stringify(row));
  }

  // Classify all orders (workspace-scoped)
  const wsClassById = new Map(wsDetails.map((w) => [w.id, w.classification]));
  for (const o of orders) {
    if (o.workspace_id == null) {
      orderClass.ORPHANED += 1;
      continue;
    }
    const wc = wsClassById.get(o.workspace_id);
    if (wc === "TEST_DEMO") orderClass.TEST_DEMO += 1;
    else if (wc === "ORPHANED" || wc === "UNKNOWN") orderClass.UNKNOWN += 1;
    else if (isFakeCustomer(o.customer_name, o.email)) orderClass.TEST_DEMO += 1;
    else orderClass.REAL += 1;
  }
  console.log("\nORDERS BY CLASS (approx)");
  console.log(JSON.stringify(orderClass));

  // Integrations summary
  const webhooks = await paginateSelect<{
    id: string;
    workspace_id: string | null;
    supply: string | null;
    created_at: string | null;
  }>("workspace_webhook_endpoints", "id, workspace_id, supply, created_at");

  const shopify = await paginateSelect<{
    id: string;
    workspace_id: string | null;
    shop_domain: string | null;
    user_id: string | null;
    uninstalled_at: string | null;
    installed_at: string | null;
  }>("shopify_stores", "id, workspace_id, shop_domain, user_id, uninstalled_at, installed_at", 1000, "installed_at");

  const wa = await paginateSelect<{
    id: string;
    workspace_id: string | null;
    provider: string | null;
    status: string | null;
    created_at: string | null;
  }>("whatsapp_connections", "id, workspace_id, provider, status, created_at");

  console.log("\nSHOPIFY STORES");
  for (const s of shopify) {
    console.log(
      JSON.stringify({
        id: s.id,
        workspace_id: s.workspace_id,
        shop_domain: s.shop_domain,
        has_user: Boolean(s.user_id),
        uninstalled: Boolean(s.uninstalled_at),
        created_at: s.installed_at,
        class: s.workspace_id
          ? (wsClassById.get(s.workspace_id) ?? "UNKNOWN")
          : "ORPHANED",
      }),
    );
  }

  console.log("\nDROPI/DROPEA WEBHOOK ENDPOINTS (tokens redacted)");
  const bySupply: Record<string, number> = {};
  for (const w of webhooks) {
    const supply = w.supply ?? "unknown";
    bySupply[supply] = (bySupply[supply] ?? 0) + 1;
  }
  console.log(JSON.stringify({ total: webhooks.length, bySupply }));
  for (const w of webhooks) {
    console.log(
      JSON.stringify({
        id: w.id,
        workspace_id: w.workspace_id,
        supply: w.supply,
        created_at: w.created_at,
        class: w.workspace_id
          ? (wsClassById.get(w.workspace_id) ?? "UNKNOWN")
          : "ORPHANED",
      }),
    );
  }

  console.log("\nWHATSAPP CONNECTIONS");
  const waByProvider: Record<string, number> = {};
  const waByStatus: Record<string, number> = {};
  for (const c of wa) {
    waByProvider[c.provider ?? "null"] = (waByProvider[c.provider ?? "null"] ?? 0) + 1;
    waByStatus[c.status ?? "null"] = (waByStatus[c.status ?? "null"] ?? 0) + 1;
  }
  console.log(JSON.stringify({ total: wa.length, byProvider: waByProvider, byStatus: waByStatus }));
  for (const c of wa) {
    console.log(
      JSON.stringify({
        id: c.id,
        workspace_id: c.workspace_id,
        provider: c.provider,
        status: c.status,
        created_at: c.created_at,
        class: c.workspace_id
          ? (wsClassById.get(c.workspace_id) ?? "UNKNOWN")
          : "ORPHANED",
      }),
    );
  }

  // Safe delete candidates = TEST_DEMO + empty ORPHANED only
  const safeDelete = wsDetails.filter(
    (w) =>
      w.classification === "TEST_DEMO" ||
      (w.classification === "ORPHANED" &&
        w.deps.orders === 0 &&
        w.deps.events === 0 &&
        w.deps.shopify === 0 &&
        w.deps.webhooks === 0 &&
        w.deps.waConnections === 0 &&
        w.deps.templates === 0 &&
        w.deps.dropea === 0),
  );
  const mustPreserve = wsDetails.filter(
    (w) => w.classification === "UNKNOWN" || w.classification === "REAL",
  );

  console.log("\nSAFE DELETE CANDIDATES (workspaces — DO NOT DELETE YET)");
  for (const w of safeDelete) {
    console.log(
      JSON.stringify({
        id: w.id,
        name: w.name,
        classification: w.classification,
        evidence: w.evidence,
        deps: w.deps,
      }),
    );
  }

  console.log("\nUNKNOWN/REAL — MUST PRESERVE (ids)");
  console.log(
    JSON.stringify({
      real: mustPreserve.filter((w) => w.classification === "REAL").map((w) => w.id),
      unknown: mustPreserve.filter((w) => w.classification === "UNKNOWN").map((w) => w.id),
    }),
  );

  const report = {
    authUsers: authUserCount,
    tableCounts,
    workspaces: {
      real: wsClass.REAL.length,
      test_demo: wsClass.TEST_DEMO.length,
      orphaned: wsClass.ORPHANED.length,
      unknown: wsClass.UNKNOWN.length,
    },
    orders: orderClass,
    nullWorkspaceOrders: { reliably_attributable: nullAttr, test_demo: nullTest, unknown: nullUnk },
    nullClassified,
    shopify: shopify.length,
    webhooks: webhooks.length,
    dropeaCreds: tableCounts.workspace_provider_credentials,
    whatsapp: wa.length,
    safeDeleteWorkspaces: safeDelete.map((w) => ({
      id: w.id,
      name: w.name,
      classification: w.classification,
      deps: w.deps,
    })),
    mustPreserveUnknown: mustPreserve
      .filter((w) => w.classification === "UNKNOWN")
      .map((w) => w.id),
    ownerless: wsDetails.filter((w) => !w.owner_user_id),
  };

  const outPath = resolve(process.cwd(), "scripts/.launch-inventory-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log("=== end inventory ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

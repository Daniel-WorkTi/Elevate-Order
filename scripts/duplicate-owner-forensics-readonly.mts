/**
 * Read-only forensics for duplicate-owner workspaces.
 * No PII, no writes.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OWNERS = [
  "2b42f74f-f39d-477f-94fa-f24b138ff4a4",
  "8706e5c4-bd2b-49e6-8e33-6190ff47a610",
] as const;

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

const url = process.env["SUPABASE_URL"]?.trim() || process.env["VITE_SUPABASE_URL"]?.trim();
const key =
  process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim() ||
  process.env["VITE_SUPABASE_SERVICE_ROLE_KEY"]?.trim();
if (!url || !key) {
  console.error("Missing supabase creds");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function countExact(
  table: string,
  filter: (q: ReturnType<typeof admin.from>) => unknown,
): Promise<{ count: number; error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin.from(table).select("*", { count: "exact", head: true });
  q = filter(q);
  const res = await q;
  if (res.error) return { count: 0, error: res.error.message };
  return { count: res.count ?? 0, error: null };
}

async function minMax(
  table: string,
  column: string,
  workspaceId: string,
): Promise<{ min: string | null; max: string | null; error: string | null }> {
  const asc = await admin
    .from(table)
    .select(column)
    .eq("workspace_id", workspaceId)
    .order(column, { ascending: true })
    .limit(1)
    .maybeSingle();
  const desc = await admin
    .from(table)
    .select(column)
    .eq("workspace_id", workspaceId)
    .order(column, { ascending: false })
    .limit(1)
    .maybeSingle();
  if (asc.error) return { min: null, max: null, error: asc.error.message };
  if (desc.error) return { min: null, max: null, error: desc.error.message };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const min = asc.data ? ((asc.data as any)[column] as string | null) : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const max = desc.data ? ((desc.data as any)[column] as string | null) : null;
  return { min, max, error: null };
}

async function tableExistsProbe(table: string): Promise<boolean> {
  const res = await admin.from(table).select("*", { count: "exact", head: true }).limit(1);
  if (!res.error) return true;
  return !/schema cache|does not exist|Could not find the table/i.test(res.error.message);
}

async function inspectWorkspace(ws: {
  id: string;
  owner_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  name: string | null;
}) {
  const id = ws.id;
  const tables = [
    "orders",
    "order_events",
    "order_confirmation_events",
    "shopify_stores",
    "workspace_webhook_endpoints",
    "workspace_provider_credentials",
    "whatsapp_connections",
    "whatsapp_sessions",
    "whatsapp_conversations",
    "whatsapp_messages",
    "message_templates",
  ] as const;

  const counts: Record<string, number | string> = {};
  for (const table of tables) {
    const exists = await tableExistsProbe(table);
    if (!exists) {
      counts[table] = "TABLE_MISSING";
      continue;
    }
    const res = await countExact(table, (q) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (q as any).eq("workspace_id", id),
    );
    counts[table] = res.error ? `ERR:${res.error}` : res.count;
  }

  // Shopify by workspace + active
  const shopifyActive = await admin
    .from("shopify_stores")
    .select("id, shop_domain, uninstalled_at, installed_at", { count: "exact" })
    .eq("workspace_id", id)
    .is("uninstalled_at", null);
  const shopifyAll = await countExact("shopify_stores", (q) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (q as any).eq("workspace_id", id),
  );

  const webhooks = await admin
    .from("workspace_webhook_endpoints")
    .select("supply, created_at, token")
    .eq("workspace_id", id);

  const creds = await admin
    .from("workspace_provider_credentials")
    .select("provider, created_at, updated_at")
    .eq("workspace_id", id);

  const waConnections = await admin
    .from("whatsapp_connections")
    .select("id, provider, status, created_at, updated_at")
    .eq("workspace_id", id);

  const orderRange = await minMax("orders", "created_at", id);
  const eventRange = await minMax("order_events", "event_date", id);

  let lastWa: string | null = null;
  const waMsg = await admin
    .from("whatsapp_messages")
    .select("created_at")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!waMsg.error && waMsg.data) {
    lastWa = (waMsg.data as { created_at?: string }).created_at ?? null;
  } else {
    const waConn = await admin
      .from("whatsapp_connections")
      .select("updated_at")
      .eq("workspace_id", id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!waConn.error && waConn.data) {
      lastWa = (waConn.data as { updated_at?: string }).updated_at ?? null;
    }
  }

  const supplies = new Set(
    (webhooks.data ?? []).map((r) => String((r as { supply?: string }).supply ?? "").toLowerCase()),
  );
  const providers = new Set(
    (creds.data ?? []).map((r) =>
      String((r as { provider?: string }).provider ?? "").toLowerCase(),
    ),
  );
  const waProviders = new Set(
    (waConnections.data ?? []).map((r) =>
      String((r as { provider?: string }).provider ?? "").toLowerCase(),
    ),
  );

  const ordersN = typeof counts.orders === "number" ? counts.orders : 0;
  const eventsN = typeof counts.order_events === "number" ? counts.order_events : 0;
  const templatesN = typeof counts.message_templates === "number" ? counts.message_templates : 0;
  const waConnN =
    typeof counts.whatsapp_connections === "number" ? counts.whatsapp_connections : 0;
  const waMsgN = typeof counts.whatsapp_messages === "number" ? counts.whatsapp_messages : 0;
  const webhookN =
    typeof counts.workspace_webhook_endpoints === "number"
      ? counts.workspace_webhook_endpoints
      : 0;
  const credN =
    typeof counts.workspace_provider_credentials === "number"
      ? counts.workspace_provider_credentials
      : 0;
  const shopifyN = typeof counts.shopify_stores === "number" ? counts.shopify_stores : 0;

  const hasIntegrations =
    (shopifyActive.count ?? 0) > 0 ||
    supplies.has("dropi") ||
    supplies.has("dropea") ||
    providers.has("dropea") ||
    waConnN > 0;
  const hasOrders = ordersN > 0 || eventsN > 0;
  const hasWaActivity = waMsgN > 0 || lastWa != null;
  const recentOrder =
    orderRange.max != null &&
    Date.now() - Date.parse(orderRange.max) < 1000 * 60 * 60 * 24 * 30;

  let classification: string;
  if (hasIntegrations && (hasOrders || hasWaActivity || recentOrder)) {
    classification = "ACTIVE_OPERATIONAL";
  } else if (
    !hasIntegrations &&
    !hasOrders &&
    templatesN === 0 &&
    waConnN === 0 &&
    webhookN === 0 &&
    credN === 0 &&
    shopifyN === 0
  ) {
    classification = "EMPTY_DUPLICATE";
  } else if (hasOrders || hasIntegrations || templatesN > 0 || waConnN > 0) {
    classification = "HISTORICAL_WITH_DATA";
  } else {
    classification = "AMBIGUOUS";
  }

  const allZeroOperational =
    ordersN === 0 &&
    eventsN === 0 &&
    (typeof counts.order_confirmation_events === "number"
      ? counts.order_confirmation_events === 0
      : true) &&
    shopifyN === 0 &&
    webhookN === 0 &&
    credN === 0 &&
    waConnN === 0 &&
    (typeof counts.whatsapp_sessions === "number" ? counts.whatsapp_sessions === 0 : true) &&
    (typeof counts.whatsapp_conversations === "number"
      ? counts.whatsapp_conversations === 0
      : true) &&
    waMsgN === 0 &&
    templatesN === 0;

  return {
    workspace_id: id,
    owner_user_id: ws.owner_user_id,
    name: ws.name ? "[redacted]" : null,
    created_at: ws.created_at,
    updated_at: ws.updated_at,
    counts,
    integrations: {
      shopify: (shopifyActive.count ?? 0) > 0,
      shopify_stores_total: shopifyAll.count,
      shopify_active: shopifyActive.count ?? 0,
      dropi: supplies.has("dropi"),
      dropea: supplies.has("dropea") || providers.has("dropea"),
      whatsapp_web: [...waProviders].some((p) => p.includes("whatsapp_web") || p === "web"),
      meta_cloud: [...waProviders].some((p) => p.includes("meta")),
      wa_connection_statuses: (waConnections.data ?? []).map((r) => ({
        provider: (r as { provider?: string }).provider ?? null,
        status: (r as { status?: string }).status ?? null,
      })),
      webhook_supplies: [...supplies],
      credential_providers: [...providers],
    },
    activity: {
      first_order_at: orderRange.min,
      last_order_at: orderRange.max,
      last_event_at: eventRange.max,
      last_whatsapp_activity_at: lastWa,
    },
    classification,
    safe_empty_duplicate_candidate: allZeroOperational,
  };
}

async function main() {
  const { data: workspaces, error } = await admin
    .from("workspaces")
    .select("id, owner_user_id, created_at, updated_at, name")
    .in("owner_user_id", [...OWNERS])
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.error?.message ?? error.message);

  const rows = workspaces ?? [];
  const byOwner: Record<string, Awaited<ReturnType<typeof inspectWorkspace>>[]> = {};
  for (const owner of OWNERS) byOwner[owner] = [];

  for (const ws of rows) {
    const report = await inspectWorkspace(ws);
    byOwner[String(ws.owner_user_id)]!.push(report);
    console.log(
      JSON.stringify({
        owner: String(ws.owner_user_id).slice(0, 8),
        workspace: ws.id.slice(0, 8),
        classification: report.classification,
        orders: report.counts.orders,
        events: report.counts.order_events,
        shopify: report.integrations.shopify,
        dropi: report.integrations.dropi,
        dropea: report.integrations.dropea,
        wa: report.integrations.whatsapp_web || report.integrations.meta_cloud,
        emptyCandidate: report.safe_empty_duplicate_candidate,
      }),
    );
  }

  const out = {
    generated_at: new Date().toISOString(),
    owners: byOwner,
  };
  const path = join(root, "docs/audit/duplicate-owner-forensics.json");
  writeFileSync(path, JSON.stringify(out, null, 2));
  console.log("WROTE", path);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

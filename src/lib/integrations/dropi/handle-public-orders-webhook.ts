import { normalizeDropeaOrder } from "@/lib/integrations/dropea/normalize-dropea-order";
import { normalizeDropiOrder } from "@/lib/integrations/dropi/normalize-dropi-order";
import {
  coalesceStatic,
  dropiWebhookPayloadSchema,
  normalizeDropiWebhookEvent,
  prepareDropiWebhookBody,
  type NormalizedDropiEvent,
} from "@/lib/integrations/dropi/dropi-webhook-normalize";
import { sourceFromWebhookAuth } from "@/lib/integrations/dropi/source";
import { resolvePublicWebhookAuth } from "@/lib/integrations/webhook-auth";

function logisticsFromEvent(event: NormalizedDropiEvent) {
  const source = (event.source ?? "").toLowerCase();
  if (source.includes("dropea")) return normalizeDropeaOrder(event.raw);
  return normalizeDropiOrder(event.raw);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type ExistingOrderRow = {
  order_id: number;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  country: string | null;
  product_summary: string | null;
  currency: string | null;
  snapshot: unknown;
};

export async function handlePublicOrdersWebhook(request: Request): Promise<Response> {
  const auth = await resolvePublicWebhookAuth(request);
  if (!auth.ok) {
    return json({ error: "Unauthorized" }, 401);
  }
  const workspaceId = auth.workspaceId;
  console.info(
    "[webhook] orders accepted",
    JSON.stringify({
      supply: auth.supply,
      workspace: workspaceId ? "set" : "none",
    }),
  );

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = dropiWebhookPayloadSchema.safeParse(prepareDropiWebhookBody(raw));
  if (!parsed.success) {
    return json({ error: "Invalid payload", issues: parsed.error.issues }, 422);
  }

  let events: NormalizedDropiEvent[];
  try {
    const list = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
    events = list.map((event) => normalizeDropiWebhookEvent(event));
  } catch (error) {
    return json(
      {
        error: "Invalid payload",
        message: error instanceof Error ? error.message : "Normalization failed",
      },
      422,
    );
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const eventRows = events.map((e) => {
    const logistics = logisticsFromEvent(e);
    return {
      order_id: e.order_id,
      event_date: e.event_date,
      status_id: e.status_id,
      status_name: e.status_name,
      details: e.details,
      tracking_code: logistics.trackingCode ?? e.tracking_code,
      tracking_url: logistics.trackingUrl ?? e.tracking_url,
      shopify_order_id: e.shopify_order_id,
      shipping_company: logistics.shippingCompany ?? e.shipping_company,
      total: e.total,
      source: sourceFromWebhookAuth(e.source, auth.supply),
      workspace_id: workspaceId,
      raw: e.raw as import("@/integrations/supabase/types").Json,
    };
  });

  const { error: eventsError } = await supabaseAdmin
    .from("order_events")
    .upsert(eventRows, { onConflict: "order_id,event_date,status_id", ignoreDuplicates: true });

  if (eventsError) {
    console.error("order_events upsert failed", eventsError);
    return json({ error: "Failed to store events" }, 500);
  }

  const latest = new Map<number, NormalizedDropiEvent>();
  for (const row of events) {
    const current = latest.get(row.order_id);
    if (!current || row.event_date > current.event_date) latest.set(row.order_id, row);
  }

  const orderIds = [...latest.keys()];
  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("orders")
    .select(
      "order_id, customer_name, phone, email, city, postal_code, address, country, product_summary, currency, snapshot",
    )
    .in("order_id", orderIds);

  if (existingError) {
    console.error("orders lookup failed", existingError);
  }

  const existingById = new Map<number, ExistingOrderRow>(
    ((existingRows ?? []) as ExistingOrderRow[]).map((row) => [row.order_id, row]),
  );

  const shopifyLookupIds = [...latest.values()]
    .map((row) => row.shopify_order_id)
    .filter((id): id is number => typeof id === "number");
  const { data: shopifyTwins } = shopifyLookupIds.length
    ? await supabaseAdmin
        .from("orders")
        .select(
          "shopify_order_id, customer_name, phone, email, city, postal_code, address, country, product_summary, currency, snapshot, shipping_company, tracking_code, tracking_url",
        )
        .in("shopify_order_id", shopifyLookupIds)
        .ilike("source", "%shopify%")
    : { data: [] as never[] };
  const twinByShopifyId = new Map(
    (shopifyTwins ?? []).map((row) => [Number(row.shopify_order_id), row]),
  );

  const nowIso = new Date().toISOString();
  const orderRows = [...latest.values()].map((row) => {
    const existing = existingById.get(row.order_id);
    const twin = row.shopify_order_id ? twinByShopifyId.get(row.shopify_order_id) : undefined;
    const logistics = logisticsFromEvent(row);
    return {
      order_id: row.order_id,
      shopify_order_id: row.shopify_order_id,
      status_id: row.status_id,
      status_name: row.status_name,
      details: row.details,
      tracking_code: logistics.trackingCode ?? row.tracking_code ?? twin?.tracking_code ?? null,
      tracking_url: logistics.trackingUrl ?? row.tracking_url ?? twin?.tracking_url ?? null,
      shipping_company:
        logistics.shippingCompany ?? row.shipping_company ?? twin?.shipping_company ?? null,
      total: row.total,
      source: sourceFromWebhookAuth(row.source, auth.supply),
      workspace_id: workspaceId,
      last_event_at: row.event_date,
      updated_at: nowIso,
      customer_name: coalesceStatic(
        row.customer_name,
        coalesceStatic(existing?.customer_name, twin?.customer_name),
      ),
      phone: coalesceStatic(row.phone, coalesceStatic(existing?.phone, twin?.phone)),
      email: coalesceStatic(row.email, coalesceStatic(existing?.email, twin?.email)),
      city: coalesceStatic(row.city, coalesceStatic(existing?.city, twin?.city)),
      postal_code: coalesceStatic(
        row.postal_code,
        coalesceStatic(existing?.postal_code, twin?.postal_code),
      ),
      address: coalesceStatic(row.address, coalesceStatic(existing?.address, twin?.address)),
      country: coalesceStatic(row.country, coalesceStatic(existing?.country, twin?.country)),
      product_summary: coalesceStatic(
        row.product_summary,
        coalesceStatic(existing?.product_summary, twin?.product_summary),
      ),
      currency: coalesceStatic(row.currency, coalesceStatic(existing?.currency, twin?.currency)),
      snapshot: (twin?.snapshot ?? row.raw ?? existing?.snapshot ?? null) as
        | import("@/integrations/supabase/types").Json
        | null,
    };
  });

  const { error: ordersError } = await supabaseAdmin
    .from("orders")
    .upsert(orderRows, { onConflict: "order_id" });

  if (ordersError) {
    console.error("orders upsert failed", ordersError);
    if (/product_summary|customer_name|snapshot|column/i.test(ordersError.message ?? "")) {
      const logisticsOnly = orderRows.map(
        ({
          customer_name: _c,
          phone: _p,
          email: _e,
          city: _city,
          postal_code: _pc,
          address: _a,
          country: _co,
          product_summary: _pr,
          currency: _cu,
          snapshot: _s,
          ...rest
        }) => rest,
      );
      const { error: fallbackError } = await supabaseAdmin
        .from("orders")
        .upsert(logisticsOnly, { onConflict: "order_id" });
      if (fallbackError) {
        console.error("orders logistics upsert failed", fallbackError);
        return json({ error: "Failed to store orders" }, 500);
      }
      return json({
        ok: true,
        received: eventRows.length,
        orders: logisticsOnly.length,
        warning: "Static order columns missing — run migration 20260813220000_orders_static_fields",
      });
    }
    return json({ error: "Failed to store orders" }, 500);
  }

  const shopifyIds = orderRows
    .map((row) => row.shopify_order_id)
    .filter((id): id is number => typeof id === "number");
  if (shopifyIds.length > 0) {
    let dupes = supabaseAdmin
      .from("orders")
      .delete()
      .in("shopify_order_id", shopifyIds)
      .ilike("source", "%shopify%");
    if (workspaceId) dupes = dupes.eq("workspace_id", workspaceId);
    await dupes;
  }

  return json({ ok: true, received: eventRows.length, orders: orderRows.length });
}

import { SHOPIFY_SOURCE, type ShopifyNormalizedOrder } from "@/lib/integrations/shopify/shopify-normalize";
import { coalesceStatic } from "@/lib/integrations/dropi/dropi-webhook-normalize";
import { parseWorkspaceId } from "@/lib/workspace/parse-workspace-id";

export type ShopifyPersistResult = {
  imported: number;
  enriched: number;
  warning: string | null;
};

function toOrderRow(
  order: ShopifyNormalizedOrder,
  nowIso: string,
  workspaceId: string | null,
) {
  return {
    order_id: order.order_id,
    shopify_order_id: order.shopify_order_id,
    ...(workspaceId ? { workspace_id: workspaceId } : {}),
    status_id: null,
    status_name: order.status_name,
    details: order.details,
    tracking_code: order.tracking_code,
    tracking_url: order.tracking_url,
    shipping_company: order.shipping_company,
    total: order.total,
    currency: order.currency,
    customer_name: order.customer_name,
    phone: order.phone,
    email: order.email,
    city: order.city,
    postal_code: order.postal_code,
    address: order.address,
    country: order.country,
    product_summary: order.product_summary,
    source: order.source,
    last_event_at: order.last_event_at,
    updated_at: nowIso,
    snapshot: order.snapshot as import("@/integrations/supabase/types").Json,
  };
}

export async function persistShopifyNormalizedOrders(
  normalized: ShopifyNormalizedOrder[],
  workspaceId?: string | null,
): Promise<ShopifyPersistResult> {
  if (normalized.length === 0) {
    return { imported: 0, enriched: 0, warning: null };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const nowIso = new Date().toISOString();
  const scopedWorkspaceId = parseWorkspaceId(workspaceId ?? "") ?? null;
  const shopifyIds = normalized.map((order) => order.shopify_order_id);

  const { data: existingRows } = await supabaseAdmin
    .from("orders")
    .select("order_id, shopify_order_id, source")
    .in("shopify_order_id", shopifyIds);

  const supplyShopifyIds = new Set(
    (existingRows ?? [])
      .filter((row) => !String(row.source ?? "").toLowerCase().includes("shopify"))
      .map((row) => Number(row.shopify_order_id)),
  );

  const fresh = normalized.filter((order) => !supplyShopifyIds.has(order.shopify_order_id));
  const orderRows = fresh.map((order) => toOrderRow(order, nowIso, scopedWorkspaceId));

  if (orderRows.length > 0) {
    const { error: upsertError } = await supabaseAdmin
      .from("orders")
      .upsert(orderRows, { onConflict: "order_id" });

    if (upsertError) {
      if (/workspace_id/i.test(upsertError.message ?? "")) {
        console.error("Shopify upsert failed", upsertError);
        throw new Error(
          "workspace_id column missing — run migration 20260823180000_shopify_stores_workspace.sql",
        );
      }
      if (/product_summary|customer_name|snapshot|column/i.test(upsertError.message ?? "")) {
        const logistics = orderRows.map(
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
          .upsert(logistics, { onConflict: "order_id" });
        if (fallbackError) {
          console.error("Shopify upsert failed", fallbackError);
          throw new Error("Failed to store Shopify orders.");
        }
        return {
          imported: logistics.length,
          enriched: 0,
          warning: "Static columns missing — run migration 20260813220000_orders_static_fields",
        };
      }
      console.error("Shopify upsert failed", upsertError);
      throw new Error("Failed to store Shopify orders.");
    }
  }

  const { data: linkedRows } = await supabaseAdmin
    .from("orders")
    .select(
      "order_id, shopify_order_id, customer_name, phone, email, city, postal_code, address, country, product_summary, currency, source",
    )
    .in("shopify_order_id", shopifyIds)
    .not("source", "ilike", "%shopify%");

  let enriched = 0;
  for (const row of linkedRows ?? []) {
    const match = normalized.find((order) => order.shopify_order_id === row.shopify_order_id);
    if (!match) continue;
    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        customer_name: coalesceStatic(match.customer_name, row.customer_name),
        phone: coalesceStatic(match.phone, row.phone),
        email: coalesceStatic(match.email, row.email),
        city: coalesceStatic(match.city, row.city),
        postal_code: coalesceStatic(match.postal_code, row.postal_code),
        address: coalesceStatic(match.address, row.address),
        country: coalesceStatic(match.country, row.country),
        product_summary: coalesceStatic(match.product_summary, row.product_summary),
        currency: coalesceStatic(match.currency, row.currency),
        ...(scopedWorkspaceId ? { workspace_id: scopedWorkspaceId } : {}),
        updated_at: nowIso,
      })
      .eq("order_id", row.order_id);
    if (!error) enriched += 1;
  }

  if (scopedWorkspaceId) {
    await supabaseAdmin
      .from("orders")
      .update({ workspace_id: scopedWorkspaceId, updated_at: nowIso })
      .in("shopify_order_id", shopifyIds)
      .is("workspace_id", null);
  }

  const eventRows = normalized.map((order) => ({
    order_id: order.order_id,
    event_date: order.last_event_at,
    status_id: null,
    status_name: order.status_name,
    details: order.details,
    tracking_code: order.tracking_code,
    tracking_url: order.tracking_url,
    shopify_order_id: order.shopify_order_id,
    shipping_company: order.shipping_company,
    total: order.total,
    source: SHOPIFY_SOURCE,
    ...(scopedWorkspaceId ? { workspace_id: scopedWorkspaceId } : {}),
    raw: order.snapshot as import("@/integrations/supabase/types").Json,
  }));

  await supabaseAdmin
    .from("order_events")
    .upsert(eventRows, { onConflict: "order_id,event_date,status_id", ignoreDuplicates: true });

  return { imported: orderRows.length, enriched, warning: null };
}

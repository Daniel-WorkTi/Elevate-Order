import { SHOPIFY_SOURCE, type ShopifyNormalizedOrder } from "@/lib/integrations/shopify/shopify-normalize";
import { coalesceStatic } from "@/lib/integrations/dropi/dropi-webhook-normalize";
import { eventStatusIdForUpsert } from "@/lib/orders/event-status-id";
import { parseWorkspaceId } from "@/lib/workspace/parse-workspace-id";

export type ShopifyPersistResult = {
  imported: number;
  enriched: number;
  warning: string | null;
};

function requireWorkspaceId(workspaceId: string | null | undefined): string {
  const id = parseWorkspaceId(workspaceId ?? "");
  if (!id) {
    throw new Error("Shopify persist requires a resolved workspace_id.");
  }
  return id;
}

function toOrderRow(order: ShopifyNormalizedOrder, nowIso: string, workspaceId: string) {
  return {
    order_id: order.order_id,
    shopify_order_id: order.shopify_order_id,
    workspace_id: workspaceId,
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

/**
 * Persist Shopify orders into exactly one workspace.
 * Never lookup/update by external IDs without workspace_id (service_role rule).
 */
export async function persistShopifyNormalizedOrders(
  normalized: ShopifyNormalizedOrder[],
  workspaceId?: string | null,
): Promise<ShopifyPersistResult> {
  if (normalized.length === 0) {
    return { imported: 0, enriched: 0, warning: null };
  }

  const scopedWorkspaceId = requireWorkspaceId(workspaceId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const nowIso = new Date().toISOString();
  const shopifyIds = normalized.map((order) => order.shopify_order_id);

  // Supply rows in THIS workspace that already carry the Shopify id (enrich path).
  const { data: existingSupplyRows } = await supabaseAdmin
    .from("orders")
    .select("order_id, shopify_order_id, source")
    .eq("workspace_id", scopedWorkspaceId)
    .in("shopify_order_id", shopifyIds)
    .not("source", "ilike", "%shopify%");

  const supplyShopifyIds = new Set(
    (existingSupplyRows ?? []).map((row) => Number(row.shopify_order_id)),
  );

  // Upsert Shopify-source rows for this workspace only.
  const shopifySourceOrders = normalized.filter(
    (order) => !supplyShopifyIds.has(order.shopify_order_id),
  );
  const orderRows = shopifySourceOrders.map((order) =>
    toOrderRow(order, nowIso, scopedWorkspaceId),
  );

  if (orderRows.length > 0) {
    const { error: upsertError } = await supabaseAdmin
      .from("orders")
      .upsert(orderRows, { onConflict: "workspace_id,order_id" });

    if (upsertError) {
      if (/workspace_id|orders_workspace_order/i.test(upsertError.message ?? "")) {
        console.error("Shopify upsert failed", upsertError);
        throw new Error(
          "workspace-scoped order uniqueness missing — run migration 20260920190000_orders_workspace_scoped_identity.sql",
        );
      }
      if (/product_summary|customer_name|snapshot|column/i.test(upsertError.message ?? "")) {
        console.error("Shopify upsert failed", upsertError);
        throw new Error(
          "Colunas de cliente/produto em falta na tabela orders. Rode a migration 20260813220000_orders_static_fields.sql no SQL Editor do Supabase e clique em Atualizar.",
        );
      }
      console.error("Shopify upsert failed", upsertError);
      throw new Error("Failed to store Shopify orders.");
    }
  }

  // Enrich Dropi/Dropea rows in the SAME workspace only.
  const { data: linkedRows } = await supabaseAdmin
    .from("orders")
    .select(
      "order_id, shopify_order_id, customer_name, phone, email, city, postal_code, address, country, product_summary, currency, source, snapshot",
    )
    .eq("workspace_id", scopedWorkspaceId)
    .in("shopify_order_id", shopifyIds)
    .not("source", "ilike", "%shopify%");

  let enriched = 0;
  for (const row of linkedRows ?? []) {
    const match = normalized.find((order) => order.shopify_order_id === row.shopify_order_id);
    if (!match) continue;
    const supplySnapshot = row.snapshot;
    const supplyHasLineItems =
      supplySnapshot &&
      typeof supplySnapshot === "object" &&
      !Array.isArray(supplySnapshot) &&
      Array.isArray((supplySnapshot as { line_items?: unknown }).line_items) &&
      ((supplySnapshot as { line_items: unknown[] }).line_items?.length ?? 0) > 0;
    const shopifyHasLineItems =
      Array.isArray((match.snapshot as { line_items?: unknown }).line_items) &&
      ((match.snapshot as { line_items: unknown[] }).line_items?.length ?? 0) > 0;

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
        ...(!supplyHasLineItems && shopifyHasLineItems
          ? { snapshot: match.snapshot as import("@/integrations/supabase/types").Json }
          : {}),
        updated_at: nowIso,
      })
      .eq("workspace_id", scopedWorkspaceId)
      .eq("order_id", row.order_id);
    if (!error) enriched += 1;
  }

  const eventRows = normalized.map((order) => ({
    order_id: order.order_id,
    event_date: order.last_event_at,
    status_id: eventStatusIdForUpsert(null),
    status_name: order.status_name,
    details: order.details,
    tracking_code: order.tracking_code,
    tracking_url: order.tracking_url,
    shopify_order_id: order.shopify_order_id,
    shipping_company: order.shipping_company,
    total: order.total,
    source: SHOPIFY_SOURCE,
    workspace_id: scopedWorkspaceId,
    raw: order.snapshot as import("@/integrations/supabase/types").Json,
  }));

  const { error: eventsError } = await supabaseAdmin.from("order_events").upsert(eventRows, {
    onConflict: "workspace_id,order_id,event_date,status_id",
    ignoreDuplicates: true,
  });
    if (eventsError) console.error("Shopify order_events upsert failed", {
      workspace_id: scopedWorkspaceId,
      provider: "shopify",
      operation: "order_events_upsert",
      message: eventsError.message,
    });

  return { imported: orderRows.length, enriched, warning: null };
}

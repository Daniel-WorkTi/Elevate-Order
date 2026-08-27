import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchDropeaOrders } from "@/lib/integrations/dropea/client";
import { normalizeDropeaOrder } from "@/lib/integrations/dropea/normalize-dropea-order";
import {
  prepareDropiWebhookBody,
  dropiWebhookPayloadSchema,
  normalizeDropiWebhookEvent,
  coalesceStatic,
  type NormalizedDropiEvent,
} from "@/lib/integrations/dropi/dropi-webhook-normalize";
import { authorizeWorkspaceInput } from "@/lib/workspace/authorize-workspace-input";

const syncInput = z.object({
  workspaceId: z.string().uuid(),
  apiToken: z.string().min(8).max(512),
});

export type SyncDropeaResult = {
  ok: boolean;
  imported: number;
  message?: string;
};

function extractOrderList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  for (const key of ["data", "orders", "results", "items", "pedidos"]) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested;
    if (nested && typeof nested === "object") {
      const inner = nested as Record<string, unknown>;
      for (const innerKey of ["data", "orders", "results", "items"]) {
        if (Array.isArray(inner[innerKey])) return inner[innerKey] as unknown[];
      }
    }
  }
  return [payload];
}

/**
 * Pull orders from Dropea API (X-API-KEY) and upsert into the workspace queue.
 * Token is sent from the browser for this call — not stored on the server.
 */
export const syncDropeaOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => syncInput.parse(data))
  .handler(async ({ data, context }): Promise<SyncDropeaResult> => {
    const workspaceId = (await authorizeWorkspaceInput(context.userId, data.workspaceId)).id;

    let payload: unknown;
    try {
      payload = await fetchDropeaOrders(data.apiToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dropea API unavailable";
      return { ok: false, imported: 0, message };
    }

    const list = extractOrderList(payload);
    const prepared = prepareDropiWebhookBody(list.length === 1 ? list[0] : list);
    const parsed = dropiWebhookPayloadSchema.safeParse(prepared);
    if (!parsed.success) {
      console.error("[dropea] sync payload rejected", parsed.error.issues.slice(0, 5));
      return {
        ok: false,
        imported: 0,
        message: "Dropea returned an unrecognized order shape",
      };
    }

    let events: NormalizedDropiEvent[];
    try {
      const rows = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
      events = rows.map((row) => {
        const normalized = normalizeDropiWebhookEvent(row);
        return { ...normalized, source: "Dropea" };
      });
    } catch (error) {
      return {
        ok: false,
        imported: 0,
        message: error instanceof Error ? error.message : "Normalization failed",
      };
    }

    if (events.length === 0) {
      return { ok: true, imported: 0, message: "No orders returned" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();

    const eventRows = events.map((e) => {
      const logistics = normalizeDropeaOrder(e.raw);
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
        source: "Dropea",
        workspace_id: workspaceId,
        raw: e.raw as import("@/integrations/supabase/types").Json,
      };
    });

    const { error: eventsError } = await supabaseAdmin
      .from("order_events")
      .upsert(eventRows, { onConflict: "order_id,event_date,status_id", ignoreDuplicates: true });

    if (eventsError) {
      console.error("[dropea] order_events upsert failed", eventsError);
      return { ok: false, imported: 0, message: "Failed to store events" };
    }

    const latest = new Map<number, NormalizedDropiEvent>();
    for (const row of events) {
      const current = latest.get(row.order_id);
      if (!current || row.event_date > current.event_date) latest.set(row.order_id, row);
    }

    const orderIds = [...latest.keys()];
    const { data: existingRows } = await supabaseAdmin
      .from("orders")
      .select(
        "order_id, customer_name, phone, email, city, postal_code, address, country, product_summary, currency",
      )
      .in("order_id", orderIds);

    const existingById = new Map(
      (existingRows ?? []).map((row) => [row.order_id as number, row]),
    );

    const orderRows = [...latest.values()].map((row) => {
      const existing = existingById.get(row.order_id);
      const logistics = normalizeDropeaOrder(row.raw);
      return {
        order_id: row.order_id,
        shopify_order_id: row.shopify_order_id,
        status_id: row.status_id,
        status_name: row.status_name,
        details: row.details,
        tracking_code: logistics.trackingCode ?? row.tracking_code,
        tracking_url: logistics.trackingUrl ?? row.tracking_url,
        shipping_company: logistics.shippingCompany ?? row.shipping_company,
        total: row.total,
        source: "Dropea",
        workspace_id: workspaceId,
        last_event_at: row.event_date,
        updated_at: nowIso,
        customer_name: coalesceStatic(row.customer_name, existing?.customer_name as string | null),
        phone: coalesceStatic(row.phone, existing?.phone as string | null),
        email: coalesceStatic(row.email, existing?.email as string | null),
        city: coalesceStatic(row.city, existing?.city as string | null),
        postal_code: coalesceStatic(row.postal_code, existing?.postal_code as string | null),
        address: coalesceStatic(row.address, existing?.address as string | null),
        country: coalesceStatic(row.country, existing?.country as string | null),
        product_summary: coalesceStatic(
          row.product_summary,
          existing?.product_summary as string | null,
        ),
        currency: coalesceStatic(row.currency, existing?.currency as string | null),
        snapshot: row.raw as import("@/integrations/supabase/types").Json,
      };
    });

    const { error: ordersError } = await supabaseAdmin
      .from("orders")
      .upsert(orderRows, { onConflict: "order_id" });

    if (ordersError) {
      console.error("[dropea] orders upsert failed", ordersError);
      return { ok: false, imported: 0, message: "Failed to store orders" };
    }

    return { ok: true, imported: orderRows.length };
  });

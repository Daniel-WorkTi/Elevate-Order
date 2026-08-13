import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const eventSchema = z.object({
  order_id: z.number().int(),
  event_date: z.string().min(1),
  status_id: z.number().int().nullable().optional(),
  status_name: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  tracking_code: z.string().nullable().optional(),
  tracking_url: z.string().nullable().optional(),
  shopify_order_id: z.number().int().nullable().optional(),
  shipping_company: z.string().nullable().optional(),
  total: z.union([z.string(), z.number()]).nullable().optional(),
  source: z.string().nullable().optional(),
});

const payloadSchema = z.union([eventSchema, z.array(eventSchema).max(500)]);

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/webhooks/orders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const providedKey =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";

        if (!expectedKey || providedKey !== expectedKey) {
          return json({ error: "Unauthorized" }, 401);
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        const parsed = payloadSchema.safeParse(raw);
        if (!parsed.success) {
          return json({ error: "Invalid payload", issues: parsed.error.issues }, 422);
        }

        const events = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const eventRows = events.map((e) => ({
          order_id: e.order_id,
          event_date: new Date(e.event_date).toISOString(),
          status_id: e.status_id ?? null,
          status_name: e.status_name ?? null,
          details: e.details ?? null,
          tracking_code: e.tracking_code ?? null,
          tracking_url: e.tracking_url ?? null,
          shopify_order_id: e.shopify_order_id ?? null,
          shipping_company: e.shipping_company ?? null,
          total: toNumber(e.total),
          source: e.source ?? "Dropi Pro",
          raw: e as unknown as import("@/integrations/supabase/types").Json,
        }));

        const { error: eventsError } = await supabaseAdmin
          .from("order_events")
          .upsert(eventRows, { onConflict: "order_id,event_date,status_id", ignoreDuplicates: true });

        if (eventsError) {
          console.error("order_events upsert failed", eventsError);
          return json({ error: "Failed to store events" }, 500);
        }

        // Keep one current row per order, using the most recent event received.
        const latest = new Map<number, (typeof eventRows)[number]>();
        for (const row of eventRows) {
          const current = latest.get(row.order_id);
          if (!current || row.event_date > current.event_date) latest.set(row.order_id, row);
        }

        const orderRows = [...latest.values()].map((row) => ({
          order_id: row.order_id,
          shopify_order_id: row.shopify_order_id,
          status_id: row.status_id,
          status_name: row.status_name,
          details: row.details,
          tracking_code: row.tracking_code,
          tracking_url: row.tracking_url,
          shipping_company: row.shipping_company,
          total: row.total,
          source: row.source,
          last_event_at: row.event_date,
          updated_at: new Date().toISOString(),
        }));

        const { error: ordersError } = await supabaseAdmin
          .from("orders")
          .upsert(orderRows, { onConflict: "order_id" });

        if (ordersError) {
          console.error("orders upsert failed", ordersError);
          return json({ error: "Failed to store orders" }, 500);
        }

        return json({ ok: true, received: eventRows.length, orders: orderRows.length });
      },
    },
  },
});

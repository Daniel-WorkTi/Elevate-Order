import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { operationalOrderToInboxItem } from "@/lib/inbox/order-to-inbox";
import type { InboxItem } from "@/lib/inbox/inbox-types";
import { getOrderSupply, type OperationalOrder } from "@/lib/order-domain";
import { isMissingWorkspaceColumn, parseWorkspaceId } from "@/lib/workspace/parse-workspace-id";

export type InboxQueueResult = {
  dropi: InboxItem[];
  dropea: InboxItem[];
  error: string | null;
};

const COLUMNS_FULL =
  "id, order_id, shopify_order_id, status_id, status_name, details, tracking_code, tracking_url, shipping_company, total, currency, customer_name, phone, email, country, city, postal_code, address, product_summary, source, last_event_at, created_at";

const COLUMNS_LEGACY =
  "id, order_id, shopify_order_id, status_id, status_name, details, tracking_code, tracking_url, shipping_company, total, source, last_event_at, created_at";

function asNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toOrder(row: Record<string, unknown>): OperationalOrder {
  return {
    id: String(row["id"] ?? ""),
    order_id: Number(row["order_id"]),
    shopify_order_id: (row["shopify_order_id"] as number | null) ?? null,
    status_id: (row["status_id"] as number | null) ?? null,
    status_name: (row["status_name"] as string | null) ?? null,
    details: (row["details"] as string | null) ?? null,
    tracking_code: (row["tracking_code"] as string | null) ?? null,
    tracking_url: (row["tracking_url"] as string | null) ?? null,
    shipping_company: (row["shipping_company"] as string | null) ?? null,
    total: asNumber((row["total"] as number | string | null) ?? null),
    currency: (row["currency"] as string | null) ?? null,
    customer_name: (row["customer_name"] as string | null) ?? null,
    phone: (row["phone"] as string | null) ?? null,
    email: (row["email"] as string | null) ?? null,
    country: (row["country"] as string | null) ?? null,
    city: (row["city"] as string | null) ?? null,
    postal_code: (row["postal_code"] as string | null) ?? null,
    address: (row["address"] as string | null) ?? null,
    source: String(row["source"] ?? ""),
    last_event_at: (row["last_event_at"] as string | null) ?? null,
    created_at: (row["created_at"] as string | null) ?? null,
    product_summary: (row["product_summary"] as string | null) ?? null,
  };
}

export const queryInboxQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => {
    const raw = (data ?? {}) as Record<string, unknown>;
    return { workspaceId: typeof raw["workspaceId"] === "string" ? raw["workspaceId"] : "" };
  })
  .handler(async ({ data }): Promise<InboxQueueResult> => {
    const workspaceId = parseWorkspaceId(data.workspaceId);
    if (!workspaceId) return { dropi: [], dropea: [], error: null };

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const full = await supabaseAdmin
        .from("orders")
        .select(COLUMNS_FULL)
        .eq("workspace_id", workspaceId)
        .order("last_event_at", { ascending: false, nullsFirst: false })
        .limit(800);

      let rows = full.data as Record<string, unknown>[] | null;
      let error = full.error;

      if (error && isMissingWorkspaceColumn(error.message)) {
        return { dropi: [], dropea: [], error: null };
      }

      if (error && /column|schema cache|does not exist/i.test(error.message ?? "")) {
        const legacy = await supabaseAdmin
          .from("orders")
          .select(COLUMNS_LEGACY)
          .eq("workspace_id", workspaceId)
          .order("last_event_at", { ascending: false, nullsFirst: false })
          .limit(800);
        rows = legacy.data as Record<string, unknown>[] | null;
        error = legacy.error;
      }

      if (error) {
        console.error("queryInboxQueue failed", error);
        return { dropi: [], dropea: [], error: "Unable to load the inbox queue." };
      }

      const dropi: InboxItem[] = [];
      const dropea: InboxItem[] = [];
      for (const row of rows ?? []) {
        const order = toOrder(row);
        const item = operationalOrderToInboxItem(order);
        if (!item) continue;
        const supply = getOrderSupply(order);
        if (supply === "dropea") dropea.push(item);
        else if (supply === "dropi" || supply === "shopify") dropi.push(item);
      }

      return { dropi, dropea, error: null };
    } catch (error) {
      console.error("queryInboxQueue failed", error);
      return { dropi: [], dropea: [], error: "Unable to load the inbox queue." };
    }
  });

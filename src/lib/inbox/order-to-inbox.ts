import { countryToFlagCode } from "@/lib/inbox/country-code";
import type { InboxItem, InboxPriority } from "@/lib/inbox/inbox-types";
import { getOrderStatus, getOrderSupply, type OperationalOrder } from "@/lib/order-domain";

function priorityFromStatus(key: string): InboxPriority | null {
  if (key === "incident") return "critical";
  if (key === "waiting" || key === "confirmed") return "waiting";
  if (key === "messaged") return "followup";
  return null;
}

/** Maps a synced order into the inbox queue. Returns null when no operator action is needed. */
export function operationalOrderToInboxItem(order: OperationalOrder): InboxItem | null {
  const supply = getOrderSupply(order);
  if (supply !== "dropi" && supply !== "dropea" && supply !== "shopify") return null;

  const status = getOrderStatus(order);
  const priority = priorityFromStatus(status.key);
  if (!priority) return null;

  const total = typeof order.total === "number" && Number.isFinite(order.total) ? order.total : 0;
  const country = order.country?.trim() || "—";
  const countryCode = countryToFlagCode(order.country) ?? "";

  return {
    id: String(order.order_id),
    supply: supply === "shopify" ? "dropi" : supply,
    customer: order.customer_name?.trim() || "—",
    country,
    countryCode,
    phone: order.phone?.trim() || "",
    total,
    currency: order.currency?.trim() || "",
    product: order.product_summary?.trim() || "—",
    issueLabel: status.label,
    issueDetail: order.details?.trim() || status.label,
    priority,
    carrier: order.shipping_company,
    tracking: order.tracking_code,
    updatedAt: order.last_event_at ?? order.created_at ?? new Date().toISOString(),
  };
}

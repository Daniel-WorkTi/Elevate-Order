import { INBOX_ITEMS } from "@/lib/inbox/inbox-demo";
import type { InboxItem } from "@/lib/inbox/inbox-types";
import type { OperationalOrder } from "@/lib/order-domain";
import type { OrdersQueryInput, OrdersQueryResult } from "@/lib/synced-orders.functions";

export function inboxItemToOperationalOrder(item: InboxItem): OperationalOrder {
  const orderId = Number(item.id.replace(/\D/g, ""));
  return {
    id: `demo-${item.id}`,
    order_id: Number.isFinite(orderId) && orderId > 0 ? orderId : 0,
    shopify_order_id: null,
    status_id: null,
    status_name: item.issueLabel,
    details: `${item.issueDetail}${item.product ? ` · ${item.product}` : ""}`,
    tracking_code: item.tracking,
    tracking_url: null,
    shipping_company: item.carrier,
    total: item.total,
    currency: item.currency,
    customer_name: item.customer,
    phone: item.phone,
    country: item.country,
    source: item.supply === "dropi" ? "Dropi Pro" : "Dropea",
    last_event_at: item.updatedAt,
    created_at: item.updatedAt,
  };
}

export function getDemoOperationalOrders(): OperationalOrder[] {
  return INBOX_ITEMS.map(inboxItemToOperationalOrder);
}

export function getDemoOrderByOrderId(orderId: number): OperationalOrder | null {
  return getDemoOperationalOrders().find((order) => order.order_id === orderId) ?? null;
}

/** Client-side query over example inbox orders when no store is connected yet. */
export function queryDemoOrders(input: OrdersQueryInput): OrdersQueryResult {
  let rows = getDemoOperationalOrders().filter((order) => {
    const source = order.source.toLowerCase();
    if (input.supply === "dropea") return source.includes("dropea");
    if (input.supply === "shopify") return false;
    return source.includes("dropi") && !source.includes("dropea");
  });

  if (input.search) {
    const q = input.search.trim().toLowerCase();
    rows = rows.filter((order) => {
      const haystack = [
        String(order.order_id),
        order.status_name,
        order.details,
        order.customer_name,
        order.country,
        order.tracking_code,
        order.shipping_company,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  if (input.status) {
    const status = input.status.toLowerCase();
    rows = rows.filter((order) => (order.status_name ?? "").toLowerCase().includes(status));
  }

  if (input.country) {
    const country = input.country.toLowerCase();
    rows = rows.filter((order) => (order.country ?? "").toLowerCase() === country);
  }

  if (input.shipping) {
    const shipping = input.shipping.toLowerCase();
    rows = rows.filter((order) => (order.shipping_company ?? "").toLowerCase() === shipping);
  }

  if (input.hasTracking === "yes") {
    rows = rows.filter((order) => Boolean(order.tracking_code?.trim()));
  } else if (input.hasTracking === "no") {
    rows = rows.filter((order) => !order.tracking_code?.trim());
  }

  if (input.from) {
    const from = new Date(input.from).getTime();
    rows = rows.filter((order) => {
      const ts = order.last_event_at ? new Date(order.last_event_at).getTime() : 0;
      return ts >= from;
    });
  }

  if (input.to) {
    const to = new Date(input.to).getTime();
    rows = rows.filter((order) => {
      const ts = order.last_event_at ? new Date(order.last_event_at).getTime() : 0;
      return ts <= to;
    });
  }

  const statuses = [...new Set(rows.map((o) => o.status_name).filter(Boolean) as string[])].sort();
  const shippingCompanies = [
    ...new Set(rows.map((o) => o.shipping_company).filter(Boolean) as string[]),
  ].sort();
  const countries = [...new Set(rows.map((o) => o.country).filter(Boolean) as string[])].sort();

  rows.sort((a, b) => {
    const dir = input.dir === "asc" ? 1 : -1;
    const av = a[input.sort];
    const bv = b[input.sort];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / input.pageSize));
  const page = Math.min(Math.max(1, input.page), pageCount);
  const start = (page - 1) * input.pageSize;
  const orders = rows.slice(start, start + input.pageSize);

  return {
    orders,
    total,
    page,
    pageSize: input.pageSize,
    pageCount,
    facets: { statuses, shippingCompanies, countries },
    error: null,
  };
}

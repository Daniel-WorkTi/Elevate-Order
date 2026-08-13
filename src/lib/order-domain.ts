export type Supply = "dropi" | "dropea";

export type OrderStatusKey =
  | "incident"
  | "waiting"
  | "messaged"
  | "shipped"
  | "delivered"
  | "confirmed"
  | "cancelled"
  | "unknown";

export type OperationalOrder = {
  id: string;
  order_id: number;
  shopify_order_id: number | null;
  status_id: number | null;
  status_name: string | null;
  details: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  shipping_company: string | null;
  total: number | null;
  /** ISO 4217 when the supply sent it. Null until the schema stores currency. */
  currency: string | null;
  customer_name: string | null;
  phone: string | null;
  country: string | null;
  source: string;
  last_event_at: string | null;
  created_at: string | null;
};

export const SUPPLY_LABEL: Record<Supply, string> = {
  dropi: "Dropi",
  dropea: "Dropea",
};

const STATUS_LABEL: Record<Exclude<OrderStatusKey, "unknown">, string> = {
  incident: "Incident",
  waiting: "Waiting",
  messaged: "Messaged",
  shipped: "Shipped",
  delivered: "Delivered",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

const STATUS_RULES: Array<{ key: Exclude<OrderStatusKey, "unknown">; pattern: RegExp }> = [
  {
    key: "incident",
    pattern:
      /inciden|exception|undeliver|failed|refus|devuel|wrong.?address|ausente|damage|avaria|customs|alf[aâ]ndega/i,
  },
  { key: "cancelled", pattern: /cancel|anulad/i },
  { key: "delivered", pattern: /deliver|entregad/i },
  {
    key: "shipped",
    pattern: /shipped|enviad|tr[aá]nsito|in[_\s-]?transit|dispatch|out for delivery/i,
  },
  { key: "messaged", pattern: /messag|contacted|whatsapp/i },
  { key: "waiting", pattern: /wait|pendiente|pending|hold|espera|unanswered/i },
  { key: "confirmed", pattern: /confirm|nuevo|new|approved|prepar|processing|paid/i },
];

export function isSupply(value: string): value is Supply {
  return value === "dropi" || value === "dropea";
}

export function getOrderSupply(order: Pick<OperationalOrder, "source">): Supply | null {
  const source = order.source.trim().toLowerCase();
  if (source.includes("dropea")) return "dropea";
  if (source.includes("dropi")) return "dropi";
  return null;
}

export function supplyMatchesSource(supply: Supply, source: string): boolean {
  const normalized = source.trim().toLowerCase();
  if (supply === "dropea") return normalized.includes("dropea");
  return normalized.includes("dropi") && !normalized.includes("dropea");
}

export function getOrderStatus(order: Pick<OperationalOrder, "status_name" | "details">): {
  key: OrderStatusKey;
  label: string;
} {
  const haystack = `${order.status_name ?? ""} ${order.details ?? ""}`.trim();
  const match = STATUS_RULES.find((rule) => rule.pattern.test(haystack));
  if (match) {
    return {
      key: match.key,
      label: order.status_name?.trim() || STATUS_LABEL[match.key],
    };
  }
  if (order.status_name?.trim()) {
    return { key: "unknown", label: order.status_name.trim() };
  }
  return { key: "unknown", label: "Unknown" };
}

const ISO_CURRENCY = /^[A-Z]{3}$/;

/** Prefer the stored ISO code. EUR is inferred only when the supply omitted currency. */
export function getOrderCurrency(order: Pick<OperationalOrder, "currency">): string {
  const code = order.currency?.trim().toUpperCase();
  if (code && ISO_CURRENCY.test(code)) return code;
  return "EUR";
}

export function formatOrderTotal(
  order: Pick<OperationalOrder, "total" | "currency">,
  locale = "pt-PT",
): string | null {
  if (order.total === null || !Number.isFinite(order.total)) return null;
  const currency = getOrderCurrency(order);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(order.total);
  } catch {
    return `${order.total.toFixed(2)} ${currency}`;
  }
}

export function formatConvertedTotal(
  order: Pick<OperationalOrder, "total" | "currency">,
  toCurrency: string,
  rate: number | null | undefined,
  locale = "pt-BR",
): string | null {
  if (order.total === null || typeof rate !== "number" || !Number.isFinite(rate)) return null;
  const from = getOrderCurrency(order);
  const to = toCurrency.trim().toUpperCase();
  if (!ISO_CURRENCY.test(to) || from === to) return null;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: to }).format(
      order.total * rate,
    );
  } catch {
    return null;
  }
}

export function formatOrderId(order: Pick<OperationalOrder, "order_id">): string {
  return `#${order.order_id}`;
}

/** Return a tracking URL only when the supply provided a real http(s) link. Never construct one. */
export function safeTrackingHref(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  return null;
}

export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export const ORDER_SORT_FIELDS = ["last_event_at", "total", "status_name", "order_id"] as const;
export type OrderSortField = (typeof ORDER_SORT_FIELDS)[number];

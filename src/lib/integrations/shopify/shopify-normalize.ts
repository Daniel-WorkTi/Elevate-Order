import { z } from "zod";

export const SHOPIFY_API_VERSION = "2026-07";
export const SHOPIFY_SOURCE = "Shopify";

/** Admin API host only. Public storefront domains (www.shop.es) are rejected. */
export function normalizeShopifyDomain(value: string): string | null {
  const trimmed = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!trimmed) return null;

  const adminStore = trimmed.match(/^(?:admin\.shopify\.com\/store\/)([a-z0-9][a-z0-9-]*)(?:\/|$)/);
  if (adminStore?.[1]) return `${adminStore[1]}.myshopify.com`;

  const host = (trimmed.split("/")[0] ?? "").replace(/^www\./, "");
  if (!host) return null;

  if (host.endsWith(".myshopify.com")) {
    const slug = host.slice(0, -".myshopify.com".length);
    return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? host : null;
  }

  if (/^[a-z0-9][a-z0-9-]*$/.test(host) && !host.includes(".")) {
    return `${host}.myshopify.com`;
  }

  return null;
}

export function shopifyDomainError(value: string): string | null {
  if (!value.trim()) return "Enter the shop domain (example.myshopify.com).";
  if (normalizeShopifyDomain(value)) return null;
  return "Use the Admin domain ending in .myshopify.com, not the public website. Shopify Admin → Settings → Domains.";
}

export type ShopifyNormalizedOrder = {
  order_id: number;
  shopify_order_id: number;
  status_name: string | null;
  details: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  shipping_company: string | null;
  total: number | null;
  currency: string | null;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  country: string | null;
  product_summary: string | null;
  source: typeof SHOPIFY_SOURCE;
  last_event_at: string;
  snapshot: Record<string, unknown>;
};

type ShopifyAddress = {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;
  zip?: string | null;
  address1?: string | null;
  address2?: string | null;
  country?: string | null;
  country_code?: string | null;
};

type ShopifyRestOrder = {
  id: number;
  name?: string;
  email?: string | null;
  created_at?: string;
  updated_at?: string;
  cancelled_at?: string | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  total_price?: string | null;
  currency?: string | null;
  note?: string | null;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  shipping_address?: ShopifyAddress | null;
  billing_address?: ShopifyAddress | null;
  shipping_lines?: Array<{ title?: string | null; code?: string | null }>;
  line_items?: Array<{
    title?: string | null;
    quantity?: number | null;
    name?: string | null;
    product_id?: number | null;
    variant_id?: number | null;
    price?: string | null;
    variant_title?: string | null;
    image?: { src?: string | null } | string | null;
  }>;
  fulfillments?: Array<{
    tracking_number?: string | null;
    tracking_url?: string | null;
    tracking_company?: string | null;
    tracking_numbers?: string[] | null;
    tracking_urls?: string[] | null;
  }>;
};

function trim(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function first(...values: unknown[]): string | null {
  for (const value of values) {
    const text = trim(value);
    if (text) return text;
  }
  return null;
}

function money(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function statusLabel(order: ShopifyRestOrder): string {
  if (order.cancelled_at) return "Cancelled";
  const fulfillment = trim(order.fulfillment_status);
  if (fulfillment === "fulfilled") return "Delivered";
  if (fulfillment === "partial") return "Shipped";
  if (fulfillment === "restocked") return "Cancelled";
  const financial = trim(order.financial_status);
  if (financial === "pending" || financial === "authorized") return "Confirmed";
  if (financial === "paid" || financial === "partially_paid") {
    return fulfillment ? "Shipped" : "Confirmed";
  }
  if (financial === "refunded" || financial === "voided") return "Cancelled";
  return first(fulfillment, financial, "Confirmed") ?? "Confirmed";
}

export function normalizeShopifyRestOrder(order: ShopifyRestOrder): ShopifyNormalizedOrder | null {
  if (!order?.id || !Number.isFinite(order.id)) return null;

  const ship = order.shipping_address;
  const bill = order.billing_address;
  const customer = order.customer;
  const fulfillment = order.fulfillments?.[0];
  const shipLine = order.shipping_lines?.[0];

  const customerName = first(
    ship?.name,
    bill?.name,
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" "),
    [ship?.first_name, ship?.last_name].filter(Boolean).join(" "),
    [bill?.first_name, bill?.last_name].filter(Boolean).join(" "),
  );

  const products = (order.line_items ?? [])
    .map((item) => {
      const title = first(item.name, item.title);
      if (!title) return null;
      const qty = item.quantity && item.quantity > 1 ? ` ×${item.quantity}` : "";
      return `${title}${qty}`;
    })
    .filter((value): value is string => Boolean(value));

  const lastEvent =
    trim(order.updated_at) ?? trim(order.created_at) ?? new Date().toISOString();

  return {
    order_id: order.id,
    shopify_order_id: order.id,
    status_name: statusLabel(order),
    details: first(order.note, order.name ? `Shopify ${order.name}` : null),
    tracking_code: first(
      fulfillment?.tracking_number,
      fulfillment?.tracking_numbers?.[0],
    ),
    tracking_url: first(fulfillment?.tracking_url, fulfillment?.tracking_urls?.[0]),
    shipping_company: first(fulfillment?.tracking_company, shipLine?.title, shipLine?.code),
    total: money(order.total_price),
    currency: first(order.currency),
    customer_name: customerName,
    phone: first(ship?.phone, bill?.phone, customer?.phone),
    email: first(order.email, customer?.email),
    city: first(ship?.city, bill?.city),
    postal_code: first(ship?.zip, bill?.zip),
    address: first(
      [ship?.address1, ship?.address2].filter(Boolean).join(", "),
      ship?.address1,
      [bill?.address1, bill?.address2].filter(Boolean).join(", "),
      bill?.address1,
    ),
    country: first(ship?.country, ship?.country_code, bill?.country, bill?.country_code),
    product_summary: products.length > 0 ? products.join(", ") : null,
    source: SHOPIFY_SOURCE,
    last_event_at: new Date(lastEvent).toISOString(),
    snapshot: order as unknown as Record<string, unknown>,
  };
}

export const shopifySyncInputSchema = z.object({
  storeDomain: z.string().min(3),
  accessToken: z.string().min(8),
  limit: z.number().int().min(1).max(250).optional(),
  workspaceId: z.string().uuid().optional(),
});

export type ShopifySyncInput = z.infer<typeof shopifySyncInputSchema>;

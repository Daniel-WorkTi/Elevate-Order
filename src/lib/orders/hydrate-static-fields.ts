import { normalizeShopifyRestOrder } from "@/lib/integrations/shopify/shopify-normalize";

export type StaticOrderFields = {
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  country: string | null;
  product_summary: string | null;
  shipping_company: string | null;
};

const EMPTY: StaticOrderFields = {
  customer_name: null,
  phone: null,
  email: null,
  city: null,
  postal_code: null,
  address: null,
  country: null,
  product_summary: null,
  shipping_company: null,
};

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const next = String(value).trim();
  return next.length > 0 ? next : null;
}

export function coalesceText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const next = value?.trim();
    if (next) return next;
  }
  return null;
}

export function staticFieldsFromSnapshot(snapshot: unknown): StaticOrderFields {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return { ...EMPTY };

  const shopify = normalizeShopifyRestOrder(snapshot as never);
  if (shopify) {
    return {
      customer_name: shopify.customer_name,
      phone: shopify.phone,
      email: shopify.email,
      city: shopify.city,
      postal_code: shopify.postal_code,
      address: shopify.address,
      country: shopify.country,
      product_summary: shopify.product_summary,
      shipping_company: shopify.shipping_company,
    };
  }

  const record = snapshot as Record<string, unknown>;
  return {
    customer_name: text(
      record["customer_name"] ?? record["customer"] ?? record["buyer_name"] ?? record["name"],
    ),
    phone: text(record["phone"] ?? record["telephone"] ?? record["buyer_phone"]),
    email: text(record["email"] ?? record["buyer_email"]),
    city: text(record["city"]),
    postal_code: text(record["postal_code"] ?? record["zip"] ?? record["zip_code"]),
    address: text(record["address"] ?? record["shipping_address"]),
    country: text(record["country"]),
    product_summary: text(
      record["product_summary"] ?? record["product"] ?? record["product_name"],
    ),
    shipping_company: text(record["shipping_company"] ?? record["carrier"]),
  };
}

export function mergeStaticFields(
  base: StaticOrderFields,
  extra: Partial<StaticOrderFields> | null | undefined,
): StaticOrderFields {
  return {
    customer_name: coalesceText(base.customer_name, extra?.customer_name),
    phone: coalesceText(base.phone, extra?.phone),
    email: coalesceText(base.email, extra?.email),
    city: coalesceText(base.city, extra?.city),
    postal_code: coalesceText(base.postal_code, extra?.postal_code),
    address: coalesceText(base.address, extra?.address),
    country: coalesceText(base.country, extra?.country),
    product_summary: coalesceText(base.product_summary, extra?.product_summary),
    shipping_company: coalesceText(base.shipping_company, extra?.shipping_company),
  };
}

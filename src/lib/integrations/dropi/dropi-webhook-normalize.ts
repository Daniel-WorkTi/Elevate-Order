import { z } from "zod";

/**
 * Dropi Pro — Notificaciones de actualizaciones de pedido (POST).
 * Core status event (official) + optional static order snapshot fields.
 * Unknown keys are kept via passthrough and stored in raw/snapshot.
 */
const nullableString = z.union([z.string(), z.number()]).nullable().optional();
const nullableInt = z.number().int().nullable().optional();

export const dropiWebhookEventSchema = z
  .object({
    order_id: z.union([z.number().int(), z.string().regex(/^\d+$/)]),
    event_date: z.string().min(1),
    status_id: nullableInt,
    status_name: z.string().nullable().optional(),
    details: z.string().nullable().optional(),
    tracking_code: z.string().nullable().optional(),
    tracking_url: z.string().nullable().optional(),
    shopify_order_id: nullableInt,
    shipping_company: z.string().nullable().optional(),
    total: z.union([z.string(), z.number()]).nullable().optional(),
    source: z.string().nullable().optional(),

    // Static / customer snapshot (optional — Dropi or middleware may include these)
    customer_name: z.string().nullable().optional(),
    customer: z.string().nullable().optional(),
    buyer_name: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    phone: nullableString,
    telephone: nullableString,
    buyer_phone: nullableString,
    email: z.string().nullable().optional(),
    buyer_email: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    postal_code: nullableString,
    zip: nullableString,
    zip_code: nullableString,
    address: z.string().nullable().optional(),
    shipping_address: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    product: z.string().nullable().optional(),
    product_name: z.string().nullable().optional(),
    product_summary: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
  })
  .passthrough();

export const dropiWebhookPayloadSchema = z.union([
  dropiWebhookEventSchema,
  z.array(dropiWebhookEventSchema).max(500),
]);

export type DropiWebhookEvent = z.infer<typeof dropiWebhookEventSchema>;

function asTrimmedString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function asInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isInteger(n) ? n : null;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const text = asTrimmedString(value);
    if (text) return text;
  }
  return null;
}

function nestedRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pick(obj: Record<string, unknown> | null, key: string): unknown {
  if (!obj) return null;
  return obj[key];
}

/** Normalize one Dropi webhook event into logistics + static snapshot fields. */
export function normalizeDropiWebhookEvent(raw: DropiWebhookEvent) {
  const record = raw as Record<string, unknown>;
  const customerObj =
    nestedRecord(pick(record, "customer_data")) ??
    nestedRecord(pick(record, "cliente")) ??
    nestedRecord(pick(record, "buyer")) ??
    (typeof pick(record, "customer") === "object"
      ? nestedRecord(pick(record, "customer"))
      : null);
  const orderObj = nestedRecord(pick(record, "order")) ?? nestedRecord(pick(record, "pedido"));

  const orderId = asInt(raw.order_id);
  if (orderId === null) {
    throw new Error("Invalid order_id");
  }

  const eventDate = new Date(raw.event_date);
  if (Number.isNaN(eventDate.getTime())) {
    throw new Error("Invalid event_date");
  }

  const customerName = firstString(
    raw.customer_name,
    typeof raw.customer === "string" ? raw.customer : null,
    raw.buyer_name,
    raw.name,
    pick(customerObj, "name"),
    pick(customerObj, "nombre"),
    pick(customerObj, "full_name"),
    [pick(customerObj, "first_name"), pick(customerObj, "last_name")].filter(Boolean).join(" "),
    pick(orderObj, "customer_name"),
  );

  const phone = firstString(
    raw.phone,
    raw.telephone,
    raw.buyer_phone,
    pick(customerObj, "phone"),
    pick(customerObj, "telephone"),
    pick(customerObj, "telefono"),
    pick(orderObj, "phone"),
  );

  const email = firstString(
    raw.email,
    raw.buyer_email,
    pick(customerObj, "email"),
    pick(orderObj, "email"),
  );

  const city = firstString(
    raw.city,
    pick(customerObj, "city"),
    pick(customerObj, "ciudad"),
    pick(orderObj, "city"),
  );
  const postalCode = firstString(
    raw.postal_code,
    raw.zip,
    raw.zip_code,
    pick(customerObj, "postal_code"),
    pick(customerObj, "zip"),
    pick(orderObj, "postal_code"),
  );
  const address = firstString(
    raw.address,
    raw.shipping_address,
    pick(customerObj, "address"),
    pick(customerObj, "direccion"),
    pick(orderObj, "address"),
  );
  const country = firstString(
    raw.country,
    pick(customerObj, "country"),
    pick(customerObj, "pais"),
    pick(orderObj, "country"),
  );
  const productSummary = firstString(
    raw.product_summary,
    raw.product_name,
    raw.product,
    pick(orderObj, "product"),
    pick(orderObj, "product_name"),
  );
  const currency = firstString(raw.currency, pick(orderObj, "currency"));

  return {
    order_id: orderId,
    event_date: eventDate.toISOString(),
    status_id: asInt(raw.status_id),
    status_name: asTrimmedString(raw.status_name),
    details: asTrimmedString(raw.details),
    tracking_code: asTrimmedString(raw.tracking_code),
    tracking_url: asTrimmedString(raw.tracking_url),
    shopify_order_id: asInt(raw.shopify_order_id),
    shipping_company: asTrimmedString(raw.shipping_company),
    total: asNumber(raw.total),
    source: asTrimmedString(raw.source) ?? "Dropi Pro",
    customer_name: customerName,
    phone,
    email,
    city,
    postal_code: postalCode,
    address,
    country,
    product_summary: productSummary,
    currency,
    raw: record,
  };
}

export type NormalizedDropiEvent = ReturnType<typeof normalizeDropiWebhookEvent>;

/** Prefer incoming static value; otherwise keep existing DB value. */
export function coalesceStatic<T>(
  incoming: T | null | undefined,
  existing: T | null | undefined,
): T | null {
  if (incoming !== null && incoming !== undefined && incoming !== "") return incoming;
  if (existing !== null && existing !== undefined && existing !== "") return existing;
  return null;
}

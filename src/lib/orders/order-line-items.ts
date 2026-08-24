export type OrderLineItemView = {
  id: string;
  title: string;
  variant: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  /** Shopify product id when present in snapshot — used to fetch thumbnails. */
  productId?: number | null;
  variantId?: number | null;
};

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const next = String(value).trim();
  return next.length > 0 ? next : null;
}

function money(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function imageFromItem(item: Record<string, unknown>): string | null {
  const candidates: unknown[] = [
    item["image"],
    item["image_url"],
    item["featured_image"],
    item["product_image"],
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("http")) return candidate;
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const record = candidate as Record<string, unknown>;
      const src =
        text(record["src"]) ??
        text(record["url"]) ??
        text(record["originalSrc"]) ??
        text(record["original_src"]);
      if (src?.startsWith("http")) return src;
    }
  }

  return null;
}

function productIdFromItem(item: Record<string, unknown>): number | null {
  const raw = item["product_id"];
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function variantIdFromItem(item: Record<string, unknown>): number | null {
  const raw = item["variant_id"];
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse Shopify (or similar) line items from an order snapshot. */
export function lineItemsFromSnapshot(snapshot: unknown): OrderLineItemView[] {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return [];
  const record = snapshot as Record<string, unknown>;
  const raw = record["line_items"];
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const items: OrderLineItemView[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const entry = raw[index];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const item = entry as Record<string, unknown>;
    const title = text(item["name"]) ?? text(item["title"]);
    if (!title) continue;
    const quantityRaw = item["quantity"];
    const quantity =
      typeof quantityRaw === "number" && Number.isFinite(quantityRaw) && quantityRaw > 0
        ? Math.floor(quantityRaw)
        : 1;
    const unitPrice = money(item["price"]);
    const lineTotal =
      money(item["line_price"]) ??
      (unitPrice != null ? unitPrice * quantity : null);
    const variant =
      text(item["variant_title"]) ??
      text(item["variant_name"]) ??
      null;
    const id =
      text(item["id"]) ??
      text(item["sku"]) ??
      `line-${index}`;

    items.push({
      id,
      title,
      variant: variant && variant !== "Default Title" ? variant : null,
      imageUrl: imageFromItem(item),
      quantity,
      unitPrice,
      lineTotal,
      productId: productIdFromItem(item),
      variantId: variantIdFromItem(item),
    });
  }
  return items;
}

/** Fallback when snapshot has no line items — split product_summary. */
export function lineItemsFromProductSummary(
  summary: string | null | undefined,
  orderTotal: number | null | undefined,
): OrderLineItemView[] {
  if (!summary?.trim() || summary.trim() === "—") return [];
  const parts = summary
    .split(/\s*,\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (parts.length === 0) return [];

  return parts.map((part, index) => {
    const qtyMatch = part.match(/^(.*?)\s*[×x]\s*(\d+)\s*$/i);
    const title = qtyMatch?.[1]?.trim() || part;
    const quantity = qtyMatch?.[2] ? Number.parseInt(qtyMatch[2], 10) : 1;
    const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const unitPrice =
      parts.length === 1 && orderTotal != null && Number.isFinite(orderTotal)
        ? orderTotal / safeQty
        : null;
    return {
      id: `summary-${index}`,
      title,
      variant: null,
      imageUrl: null,
      quantity: safeQty,
      unitPrice,
      lineTotal: unitPrice != null ? unitPrice * safeQty : null,
      productId: null,
      variantId: null,
    };
  });
}

export function resolveOrderLineItems(input: {
  snapshot?: unknown;
  productSummary: string | null | undefined;
  total: number | null | undefined;
}): OrderLineItemView[] {
  const fromSnapshot = lineItemsFromSnapshot(input.snapshot);
  if (fromSnapshot.length > 0) return fromSnapshot;
  return lineItemsFromProductSummary(input.productSummary, input.total);
}

export function paymentMethodFromSnapshot(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const record = snapshot as Record<string, unknown>;

  const gateways = record["payment_gateway_names"];
  if (Array.isArray(gateways)) {
    const first = gateways.map((g) => text(g)).find(Boolean);
    if (first) return first;
  }

  return (
    text(record["payment_method"]) ??
    text(record["gateway"]) ??
    text(record["payment_method_title"]) ??
    null
  );
}

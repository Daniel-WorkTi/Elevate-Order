import { SHOPIFY_API_VERSION } from "@/lib/integrations/shopify/shopify-normalize";

type ShopifyProductImage = {
  id?: number;
  src?: string | null;
  variant_ids?: number[] | null;
};

type ShopifyProduct = {
  id?: number;
  image?: { src?: string | null } | null;
  images?: ShopifyProductImage[] | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function productIdsFromOrders(orders: unknown[]): number[] {
  const ids = new Set<number>();
  for (const order of orders) {
    const record = asRecord(order);
    const items = record?.["line_items"];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const row = asRecord(item);
      const productId = Number(row?.["product_id"]);
      if (Number.isFinite(productId) && productId > 0) ids.add(productId);
    }
  }
  return [...ids];
}

function pickProductImage(
  product: ShopifyProduct,
  variantId: number | null,
): string | null {
  if (variantId && Array.isArray(product.images)) {
    const match = product.images.find(
      (image) =>
        typeof image?.src === "string" &&
        image.src.startsWith("http") &&
        Array.isArray(image.variant_ids) &&
        image.variant_ids.includes(variantId),
    );
    if (match?.src) return match.src;
  }

  const primary = product.image?.src;
  if (typeof primary === "string" && primary.startsWith("http")) return primary;

  const first = product.images?.find(
    (image) => typeof image?.src === "string" && image.src.startsWith("http"),
  );
  return first?.src ?? null;
}

/**
 * Batch-load product images. Requires `read_products` on the Admin token.
 * Fails soft (empty map) when the scope is missing or the request fails.
 */
export async function fetchShopifyProductImageMap(
  host: string,
  accessToken: string,
  productIds: number[],
): Promise<Map<number, ShopifyProduct>> {
  const map = new Map<number, ShopifyProduct>();
  const unique = [...new Set(productIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (unique.length === 0) return map;

  const token = accessToken.trim();
  if (!token) return map;

  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    try {
      const params = new URLSearchParams({
        ids: chunk.join(","),
        fields: "id,image,images",
        limit: String(chunk.length),
      });
      const response = await fetch(
        `https://${host}/admin/api/${SHOPIFY_API_VERSION}/products.json?${params}`,
        {
          headers: {
            "X-Shopify-Access-Token": token,
            Accept: "application/json",
          },
        },
      );
      if (!response.ok) {
        console.warn(
          "[shopify] product images fetch failed",
          response.status,
          "(needs read_products scope)",
        );
        break;
      }
      const json = (await response.json()) as { products?: ShopifyProduct[] };
      for (const product of json.products ?? []) {
        if (product?.id) map.set(product.id, product);
      }
    } catch (error) {
      console.warn("[shopify] product images fetch error", error);
      break;
    }
  }

  return map;
}

/** Attach `image: { src }` onto each line item that has a product_id. */
export function applyProductImagesToOrders(
  orders: unknown[],
  productsById: Map<number, ShopifyProduct>,
): unknown[] {
  if (productsById.size === 0) return orders;

  return orders.map((order) => {
    const record = asRecord(order);
    if (!record) return order;
    const items = record["line_items"];
    if (!Array.isArray(items) || items.length === 0) return order;

    const nextItems = items.map((item) => {
      const row = asRecord(item);
      if (!row) return item;

      const existing =
        (typeof row["image"] === "string" && row["image"].startsWith("http")
          ? row["image"]
          : null) ??
        (asRecord(row["image"])?.["src"] as string | undefined);
      if (typeof existing === "string" && existing.startsWith("http")) return item;

      const productId = Number(row["product_id"]);
      const variantId = Number(row["variant_id"]);
      const product = Number.isFinite(productId) ? productsById.get(productId) : undefined;
      if (!product) return item;

      const src = pickProductImage(
        product,
        Number.isFinite(variantId) ? variantId : null,
      );
      if (!src) return item;
      return { ...row, image: { src } };
    });

    return { ...record, line_items: nextItems };
  });
}

export async function attachShopifyLineItemImages(
  host: string,
  accessToken: string,
  orders: unknown[],
): Promise<unknown[]> {
  const productIds = productIdsFromOrders(orders);
  if (productIds.length === 0) return orders;
  const productsById = await fetchShopifyProductImageMap(host, accessToken, productIds);
  return applyProductImagesToOrders(orders, productsById);
}

/** Resolve image URLs for product/variant pairs (detail-page enrichment). */
export async function resolveShopifyLineItemImages(
  host: string,
  accessToken: string,
  refs: Array<{ productId: number | null; variantId: number | null }>,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const productIds = refs
    .map((ref) => ref.productId)
    .filter((id): id is number => typeof id === "number" && id > 0);
  const productsById = await fetchShopifyProductImageMap(host, accessToken, productIds);

  for (const ref of refs) {
    if (!ref.productId) continue;
    const product = productsById.get(ref.productId);
    if (!product) continue;
    const src = pickProductImage(product, ref.variantId);
    if (!src) continue;
    result.set(`${ref.productId}:${ref.variantId ?? 0}`, src);
  }
  return result;
}

export function lineItemImageKey(productId: number, variantId: number | null): string {
  return `${productId}:${variantId ?? 0}`;
}

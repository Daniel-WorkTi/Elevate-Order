import { normalizeShopifyDomain } from "@/lib/integrations/shopify/shopify-normalize";

/**
 * Admin deep-link for a Shopify order when store domain + order id are known.
 * Never invents a store slug.
 */
export function shopifyAdminOrderUrl(
  storeDomain: string | null | undefined,
  shopifyOrderId: number | null | undefined,
): string | null {
  if (shopifyOrderId == null || !Number.isFinite(shopifyOrderId) || shopifyOrderId <= 0) {
    return null;
  }
  const host = normalizeShopifyDomain(storeDomain ?? "");
  if (!host) return null;
  const slug = host.replace(/\.myshopify\.com$/i, "").trim();
  if (!slug) return null;
  return `https://admin.shopify.com/store/${slug}/orders/${shopifyOrderId}`;
}

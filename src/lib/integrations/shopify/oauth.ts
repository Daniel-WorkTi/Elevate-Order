import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { normalizeShopifyDomain } from "@/lib/integrations/shopify/shopify-normalize";

export const SHOPIFY_OAUTH_STATE_COOKIE = "elevate_shopify_oauth";
/**
 * Minimal Admin API scopes for the ELEVATE call-center flow.
 * - read_orders: pedidos, itens, valores, fulfillment, tracking, transações
 * - read_customers: nome, telefone, e-mail, morada (protected customer data)
 * - read_products: nome, variantes, imagens, coleções (thumbnails no detalhe)
 *
 * Do not add inventory/locations/write_* until a feature needs them.
 * Protected customer fields also need Partner Dashboard approval when distributing the app.
 */
export const SHOPIFY_DEFAULT_SCOPES = "read_orders,read_customers,read_products";

/** Ordered list for UI — keep in sync with SHOPIFY_DEFAULT_SCOPES. */
export const SHOPIFY_REQUIRED_SCOPES = [
  "read_orders",
  "read_customers",
  "read_products",
] as const;

export type ShopifyAppConfig = {
  apiKey: string;
  apiSecret: string;
  scopes: string;
};

export function getShopifyAppConfig(): ShopifyAppConfig | null {
  const apiKey = process.env["SHOPIFY_API_KEY"]?.trim();
  const apiSecret = process.env["SHOPIFY_API_SECRET"]?.trim();
  if (!apiKey || !apiSecret) return null;
  const scopes = process.env["SHOPIFY_APP_SCOPES"]?.trim() || SHOPIFY_DEFAULT_SCOPES;
  return { apiKey, apiSecret, scopes };
}

export function shopifyOauthConfigured(): boolean {
  return getShopifyAppConfig() !== null;
}

/** Shopify OAuth/callback HMAC over sorted query params (hmac + signature excluded). */
export function verifyShopifyQueryHmac(
  searchParams: URLSearchParams,
  apiSecret: string,
): boolean {
  const hmac = searchParams.get("hmac");
  if (!hmac) return false;

  const message = [...searchParams.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const digest = createHmac("sha256", apiSecret).update(message).digest("hex");
  try {
    const expected = Buffer.from(digest, "utf8");
    const received = Buffer.from(hmac, "utf8");
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

/** Shopify webhook HMAC: base64 HMAC-SHA256 of the raw body. */
export function verifyShopifyWebhookHmac(
  rawBody: string,
  headerHmac: string | null,
  apiSecret: string,
): boolean {
  if (!headerHmac) return false;
  const digest = createHmac("sha256", apiSecret).update(rawBody, "utf8").digest("base64");
  try {
    const expected = Buffer.from(digest, "utf8");
    const received = Buffer.from(headerHmac, "utf8");
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

export function createOauthNonce(): string {
  return randomBytes(24).toString("hex");
}

export function shopifyAuthorizeUrl(input: {
  shop: string;
  apiKey: string;
  scopes: string;
  redirectUri: string;
  state: string;
}): string {
  const shop = normalizeShopifyDomain(input.shop);
  if (!shop) {
    throw new Error("Invalid Shopify shop domain");
  }
  const params = new URLSearchParams({
    client_id: input.apiKey,
    scope: input.scopes,
    redirect_uri: input.redirectUri,
    state: input.state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export async function exchangeShopifyAccessToken(input: {
  shop: string;
  apiKey: string;
  apiSecret: string;
  code: string;
}): Promise<{ accessToken: string; scope: string | null }> {
  const shop = normalizeShopifyDomain(input.shop);
  if (!shop) throw new Error("Invalid Shopify shop domain");

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: input.apiKey,
      client_secret: input.apiSecret,
      code: input.code,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[shopify] token exchange failed", response.status);
    throw new Error(
      body.slice(0, 120) || `Shopify token exchange failed (HTTP ${response.status})`,
    );
  }

  const json = (await response.json()) as { access_token?: unknown; scope?: unknown };
  const accessToken = typeof json.access_token === "string" ? json.access_token.trim() : "";
  if (!accessToken) throw new Error("Shopify did not return an access token");
  const scope = typeof json.scope === "string" ? json.scope : null;
  return { accessToken, scope };
}

export type ShopifyOauthCookie = {
  state: string;
  shop: string;
  userId: string;
  workspaceId?: string;
};

export function encodeOauthCookie(value: ShopifyOauthCookie): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeOauthCookie(raw: string | undefined): ShopifyOauthCookie | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<ShopifyOauthCookie>;
    if (
      typeof parsed.state === "string" &&
      typeof parsed.shop === "string" &&
      typeof parsed.userId === "string"
    ) {
      return {
        state: parsed.state,
        shop: parsed.shop,
        userId: parsed.userId,
        ...(typeof parsed.workspaceId === "string" ? { workspaceId: parsed.workspaceId } : {}),
      };
    }
    return null;
  } catch {
    return null;
  }
}

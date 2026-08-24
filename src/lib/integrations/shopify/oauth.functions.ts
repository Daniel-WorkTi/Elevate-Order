import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPublicAppUrl } from "@/lib/integrations/workspace-webhook.functions";
import {
  SHOPIFY_API_VERSION,
  normalizeShopifyDomain,
  normalizeShopifyRestOrder,
} from "@/lib/integrations/shopify/shopify-normalize";
import { attachShopifyLineItemImages } from "@/lib/integrations/shopify/shopify-product-images";
import { persistShopifyNormalizedOrders } from "@/lib/integrations/shopify/persist";

const shopInput = z.object({
  shop: z.string().min(3).max(120),
  workspaceId: z.string().uuid().optional(),
});

const WEBHOOK_TOPICS = [
  "orders/create",
  "orders/updated",
  "orders/cancelled",
  "app/uninstalled",
] as const;

export type ShopifyOauthStatus = {
  oauthConfigured: boolean;
  connected: boolean;
  shopDomain: string | null;
  lastSyncAt: string | null;
  orderCount: number | null;
};

async function requireUserId(): Promise<string> {
  const { createServerSupabase } = await import("@/integrations/supabase/ssr.server");
  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("unauthenticated");
  return data.user.id;
}

export const getShopifyOauthStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<ShopifyOauthStatus> => {
    const oauthConfigured = (
      await import("@/lib/integrations/shopify/oauth")
    ).shopifyOauthConfigured();
    const empty: ShopifyOauthStatus = {
      oauthConfigured,
      connected: false,
      shopDomain: null,
      lastSyncAt: null,
      orderCount: null,
    };

    try {
      const userId = await requireUserId();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("shopify_stores")
        .select("shop_domain, last_sync_at, uninstalled_at")
        .eq("user_id", userId)
        .is("uninstalled_at", null)
        .order("installed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data?.shop_domain) return empty;

      const countRes = await supabaseAdmin
        .from("orders")
        .select("order_id", { count: "exact", head: true })
        .ilike("source", "%shopify%");

      return {
        oauthConfigured,
        connected: true,
        shopDomain: data.shop_domain,
        lastSyncAt: data.last_sync_at,
        orderCount: countRes.count ?? null,
      };
    } catch (error) {
      console.error("[shopify] oauth status failed", error);
      return empty;
    }
  });

export const startShopifyInstall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => shopInput.parse(data))
  .handler(async ({ data }): Promise<{ url: string }> => {
    const oauth = await import("@/lib/integrations/shopify/oauth");
    const config = oauth.getShopifyAppConfig();
    if (!config) {
      throw new Error("Shopify app is not configured on this server.");
    }

    const shop = normalizeShopifyDomain(data.shop);
    if (!shop) throw new Error("Use a .myshopify.com Admin domain.");

    const userId = await requireUserId();
    const state = oauth.createOauthNonce();
    const origin = getPublicAppUrl();
    const redirectUri = `${origin}/auth/shopify/callback`;
    const url = oauth.shopifyAuthorizeUrl({
      shop,
      apiKey: config.apiKey,
      scopes: config.scopes,
      redirectUri,
      state,
    });

    const { setCookie } = await import("@tanstack/react-start/server");
    setCookie(
      oauth.SHOPIFY_OAUTH_STATE_COOKIE,
      oauth.encodeOauthCookie({
        state,
        shop,
        userId,
        ...(data.workspaceId ? { workspaceId: data.workspaceId } : {}),
      }),
      {
        httpOnly: true,
        path: "/",
        maxAge: 600,
        // None is required so the cookie survives the return from admin.shopify.com.
        // Lax is dropped when Shopify bounces through its Admin iframe.
        sameSite: origin.startsWith("https://") ? "none" : "lax",
        secure: origin.startsWith("https://"),
      },
    );

    return { url };
  });

const callbackSchema = z.object({
  shop: z.string(),
  code: z.string(),
  state: z.string(),
  hmac: z.string(),
  query: z.string(),
});

export const completeShopifyInstall = createServerFn({ method: "POST" })
  .validator((data: unknown) => callbackSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: true; shop: string }> => {
    const oauth = await import("@/lib/integrations/shopify/oauth");
    const config = oauth.getShopifyAppConfig();
    if (!config) throw new Error("Shopify app is not configured on this server.");

    const params = new URLSearchParams(data.query);
    if (!oauth.verifyShopifyQueryHmac(params, config.apiSecret)) {
      throw new Error("Invalid Shopify HMAC");
    }

    const shop = normalizeShopifyDomain(data.shop);
    if (!shop) throw new Error("Invalid shop domain");

    const { getCookies, setCookie } = await import("@tanstack/react-start/server");
    const cookie = oauth.decodeOauthCookie(getCookies()[oauth.SHOPIFY_OAUTH_STATE_COOKIE]);
    if (!cookie || cookie.state !== data.state || cookie.shop !== shop) {
      throw new Error("Invalid OAuth state");
    }

    const token = await oauth.exchangeShopifyAccessToken({
      shop,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      code: data.code,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("shopify_stores").upsert(
      {
        user_id: cookie.userId,
        shop_domain: shop,
        access_token: token.accessToken,
        scope: token.scope,
        installed_at: new Date().toISOString(),
        uninstalled_at: null,
        ...(cookie.workspaceId ? { workspace_id: cookie.workspaceId } : {}),
      },
      { onConflict: "user_id,shop_domain" },
    );

    if (error) {
      console.error("[shopify] store persist failed", error);
      throw new Error("Unable to save Shopify store. Run the shopify_stores migration.");
    }

    await registerShopifyWebhooks(shop, token.accessToken);
    if (cookie.workspaceId) {
      try {
        await pullAndPersistShopifyOrders(shop, token.accessToken, 50, cookie.workspaceId);
      } catch (error) {
        console.error("[shopify] initial sync after install failed", error);
      }
    }

    setCookie(oauth.SHOPIFY_OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return { ok: true, shop };
  });

export const disconnectShopifyStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ ok: true }> => {
    const userId = await requireUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    await supabaseAdmin
      .from("shopify_stores")
      .update({ access_token: "", uninstalled_at: nowIso })
      .eq("user_id", userId)
      .is("uninstalled_at", null);
    return { ok: true };
  });

export const syncConnectedShopifyStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ workspaceId: z.string().uuid().optional() }).parse(data ?? {}),
  )
  .handler(
    async ({ data }): Promise<{
      ok: boolean;
      imported: number;
      enriched: number;
      error: string | null;
    }> => {
      try {
        const userId = await requireUserId();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: store, error } = await supabaseAdmin
          .from("shopify_stores")
          .select("shop_domain, access_token, workspace_id")
          .eq("user_id", userId)
          .is("uninstalled_at", null)
          .order("installed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !store?.access_token || !store.shop_domain) {
          return { ok: false, imported: 0, enriched: 0, error: "No Shopify store connected." };
        }

        const workspaceId = data.workspaceId ?? store.workspace_id;
        if (data.workspaceId) {
          await supabaseAdmin
            .from("shopify_stores")
            .update({ workspace_id: data.workspaceId })
            .eq("user_id", userId)
            .eq("shop_domain", store.shop_domain);
        }

        const result = await pullAndPersistShopifyOrders(
          store.shop_domain,
          store.access_token,
          50,
          workspaceId,
        );
        await supabaseAdmin
          .from("shopify_stores")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("shop_domain", store.shop_domain);

        return {
          ok: true,
          imported: result.imported,
          enriched: result.enriched,
          error: result.warning,
        };
      } catch (error) {
        console.error("[shopify] connected sync failed", error);
        return {
          ok: false,
          imported: 0,
          enriched: 0,
          error: error instanceof Error ? error.message : "Unable to sync Shopify orders.",
        };
      }
    },
  );

export async function pullAndPersistShopifyOrders(
  shop: string,
  accessToken: string,
  limit: number,
  workspaceId?: string | null,
) {
  const host = normalizeShopifyDomain(shop);
  if (!host) throw new Error("Invalid Shopify domain");
  const token = accessToken.trim();
  if (!token) throw new Error("Missing Shopify access token");

  const params = new URLSearchParams({
    status: "any",
    limit: String(limit),
    order: "updated_at desc",
  });
  const response = await fetch(
    `https://${host}/admin/api/${SHOPIFY_API_VERSION}/orders.json?${params}`,
    {
      headers: {
        "X-Shopify-Access-Token": token,
        Accept: "application/json",
      },
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Shopify API error ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`);
  }
  const json = (await response.json()) as { orders?: unknown[] };
  const rawOrders = Array.isArray(json.orders) ? json.orders : [];
  const withImages = await attachShopifyLineItemImages(host, token, rawOrders);
  const normalized = withImages
    .map((row) => normalizeShopifyRestOrder(row as never))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  return persistShopifyNormalizedOrders(normalized, workspaceId);
}

async function registerShopifyWebhooks(shop: string, accessToken: string) {
  const address = `${getPublicAppUrl()}/api/public/webhooks/shopify`;
  for (const topic of WEBHOOK_TOPICS) {
    try {
      const response = await fetch(
        `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            webhook: { topic, address, format: "json" },
          }),
        },
      );
      if (!response.ok && response.status !== 422) {
        console.error("[shopify] webhook register failed", topic, response.status);
      }
    } catch (error) {
      console.error("[shopify] webhook register error", topic, error);
    }
  }
}

export async function markShopifyShopUninstalled(shopDomain: string) {
  const shop = normalizeShopifyDomain(shopDomain);
  if (!shop) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("shopify_stores")
    .update({ access_token: "", uninstalled_at: new Date().toISOString() })
    .eq("shop_domain", shop)
    .is("uninstalled_at", null);
}

export async function findShopifyStoreForShop(shopDomain: string): Promise<{
  accessToken: string;
  workspaceId: string | null;
} | null> {
  const shop = normalizeShopifyDomain(shopDomain);
  if (!shop) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("shopify_stores")
    .select("access_token, workspace_id")
    .eq("shop_domain", shop)
    .is("uninstalled_at", null)
    .limit(1)
    .maybeSingle();
  const accessToken = data?.access_token?.trim() || "";
  if (!accessToken) return null;
  return {
    accessToken,
    workspaceId: typeof data?.workspace_id === "string" ? data.workspace_id : null,
  };
}

export async function findShopifyTokenForShop(shopDomain: string): Promise<string | null> {
  const store = await findShopifyStoreForShop(shopDomain);
  return store?.accessToken ?? null;
}

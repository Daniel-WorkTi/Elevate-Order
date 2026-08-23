import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SHOPIFY_API_VERSION,
  SHOPIFY_SOURCE,
  normalizeShopifyDomain,
  normalizeShopifyRestOrder,
  shopifySyncInputSchema,
  type ShopifyNormalizedOrder,
} from "@/lib/integrations/shopify/shopify-normalize";
import { coalesceStatic } from "@/lib/integrations/dropi/dropi-webhook-normalize";

export type ShopifySyncResult = {
  ok: boolean;
  imported: number;
  enriched: number;
  error: string | null;
};

export type ShopifyDashboardResult = {
  summary: {
    status: "connected" | "configured" | "error" | "not_configured";
    method: "api";
    serverConfigured: boolean;
    lastSyncAt: string | null;
    orderCount: number | null;
    errorMessage: string | null;
  };
  error: string | null;
};

function requireAdminDomain(domain: string): string {
  const host = normalizeShopifyDomain(domain);
  if (!host) {
    throw new Error(
      "Use the Admin domain ending in .myshopify.com, not the public website (e.g. www.eronostore.es). Find it in Shopify Admin → Settings → Domains.",
    );
  }
  return host;
}

function requireAdminToken(accessToken: string): string {
  const token = accessToken.trim();
  if (token.startsWith("shpat_")) return token;
  if (token.startsWith("shpss_") || token.startsWith("shpca_")) {
    throw new Error(
      "That looks like the API secret, not the Admin API access token. Open the custom app → API credentials and copy the token that starts with shpat_.",
    );
  }
  throw new Error(
    "Paste the Admin API access token (starts with shpat_). Client ID / Client Secret will not work.",
  );
}

function shopifyAdminUrl(host: string, path: string) {
  return `https://${host}/admin/api/${SHOPIFY_API_VERSION}/${path}`;
}

async function shopifyGet(host: string, token: string, path: string) {
  return fetch(shopifyAdminUrl(host, path), {
    headers: {
      "X-Shopify-Access-Token": token,
      Accept: "application/json",
    },
  });
}

function authError(status: number, body: string, kind: "shop" | "orders"): Error {
  const hint =
    kind === "orders"
      ? "Token reached Shopify, but read_orders is missing. Custom app → Configuration → Admin API scopes → read_orders. Save, reinstall, then copy the new shpat_ token."
      : "Shopify rejected this token. Install the custom app on the store, then copy Admin API access token (starts with shpat_) from API credentials — shown only once.";
  const snippet = body.replace(/\s+/g, " ").slice(0, 120);
  return new Error(
    snippet ? `${hint} (HTTP ${status}: ${snippet})` : `${hint} (HTTP ${status})`,
  );
}

async function fetchShopifyOrders(domain: string, accessToken: string, limit: number) {
  const host = requireAdminDomain(domain);
  const token = requireAdminToken(accessToken);
  const params = new URLSearchParams({
    status: "any",
    limit: String(limit),
    order: "updated_at desc",
  });
  const response = await shopifyGet(host, token, `orders.json?${params}`);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) {
      throw authError(response.status, body, "orders");
    }
    throw new Error(`Shopify API error ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`);
  }

  const json = (await response.json()) as { orders?: unknown[] };
  return Array.isArray(json.orders) ? json.orders : [];
}

function toOrderRow(order: ShopifyNormalizedOrder, nowIso: string) {
  return {
    order_id: order.order_id,
    shopify_order_id: order.shopify_order_id,
    status_id: null,
    status_name: order.status_name,
    details: order.details,
    tracking_code: order.tracking_code,
    tracking_url: order.tracking_url,
    shipping_company: order.shipping_company,
    total: order.total,
    currency: order.currency,
    customer_name: order.customer_name,
    phone: order.phone,
    email: order.email,
    city: order.city,
    postal_code: order.postal_code,
    address: order.address,
    country: order.country,
    product_summary: order.product_summary,
    source: order.source,
    last_event_at: order.last_event_at,
    updated_at: nowIso,
    snapshot: order.snapshot as import("@/integrations/supabase/types").Json,
  };
}

/**
 * Pull recent Shopify orders with full customer / product / tracking fields
 * into `orders`, and enrich Dropi/Dropea rows that share the same shopify_order_id.
 */
export const syncShopifyOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => shopifySyncInputSchema.parse(data))
  .handler(async ({ data }): Promise<ShopifySyncResult> => {
    try {
      const limit = data.limit ?? 50;
      const rawOrders = await fetchShopifyOrders(data.storeDomain, data.accessToken, limit);
      const normalized = rawOrders
        .map((row) => normalizeShopifyRestOrder(row as never))
        .filter((row): row is ShopifyNormalizedOrder => Boolean(row));

      if (normalized.length === 0) {
        return { ok: true, imported: 0, enriched: 0, error: null };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const nowIso = new Date().toISOString();
      const orderRows = normalized.map((order) => toOrderRow(order, nowIso));

      const { error: upsertError } = await supabaseAdmin
        .from("orders")
        .upsert(orderRows, { onConflict: "order_id" });

      if (upsertError) {
        // Fallback without static columns if migration missing
        if (/product_summary|customer_name|snapshot|column/i.test(upsertError.message ?? "")) {
          const logistics = orderRows.map(
            ({
              customer_name: _c,
              phone: _p,
              email: _e,
              city: _city,
              postal_code: _pc,
              address: _a,
              country: _co,
              product_summary: _pr,
              currency: _cu,
              snapshot: _s,
              ...rest
            }) => rest,
          );
          const { error: fallbackError } = await supabaseAdmin
            .from("orders")
            .upsert(logistics, { onConflict: "order_id" });
          if (fallbackError) {
            console.error("Shopify upsert failed", fallbackError);
            return { ok: false, imported: 0, enriched: 0, error: "Failed to store Shopify orders." };
          }
          return {
            ok: true,
            imported: logistics.length,
            enriched: 0,
            error: "Static columns missing — run migration 20260813220000_orders_static_fields",
          };
        }
        console.error("Shopify upsert failed", upsertError);
        return { ok: false, imported: 0, enriched: 0, error: "Failed to store Shopify orders." };
      }

      // Enrich supply rows (Dropi/Dropea) that already reference this Shopify order id.
      const shopifyIds = normalized.map((order) => order.shopify_order_id);
      const { data: linkedRows } = await supabaseAdmin
        .from("orders")
        .select(
          "order_id, shopify_order_id, customer_name, phone, email, city, postal_code, address, country, product_summary, currency, source",
        )
        .in("shopify_order_id", shopifyIds)
        .not("source", "ilike", "%shopify%");

      let enriched = 0;
      for (const row of linkedRows ?? []) {
        const match = normalized.find((order) => order.shopify_order_id === row.shopify_order_id);
        if (!match) continue;
        const { error } = await supabaseAdmin
          .from("orders")
          .update({
            customer_name: coalesceStatic(match.customer_name, row.customer_name),
            phone: coalesceStatic(match.phone, row.phone),
            email: coalesceStatic(match.email, row.email),
            city: coalesceStatic(match.city, row.city),
            postal_code: coalesceStatic(match.postal_code, row.postal_code),
            address: coalesceStatic(match.address, row.address),
            country: coalesceStatic(match.country, row.country),
            product_summary: coalesceStatic(match.product_summary, row.product_summary),
            currency: coalesceStatic(match.currency, row.currency),
            updated_at: nowIso,
          })
          .eq("order_id", row.order_id);
        if (!error) enriched += 1;
      }

      // Audit events for Shopify sync batch
      const eventRows = normalized.map((order) => ({
        order_id: order.order_id,
        event_date: order.last_event_at,
        status_id: null,
        status_name: order.status_name,
        details: order.details,
        tracking_code: order.tracking_code,
        tracking_url: order.tracking_url,
        shopify_order_id: order.shopify_order_id,
        shipping_company: order.shipping_company,
        total: order.total,
        source: SHOPIFY_SOURCE,
        raw: order.snapshot as import("@/integrations/supabase/types").Json,
      }));

      await supabaseAdmin
        .from("order_events")
        .upsert(eventRows, { onConflict: "order_id,event_date,status_id", ignoreDuplicates: true });

      return { ok: true, imported: orderRows.length, enriched, error: null };
    } catch (error) {
      console.error("syncShopifyOrders failed", error);
      return {
        ok: false,
        imported: 0,
        enriched: 0,
        error: error instanceof Error ? error.message : "Unable to sync Shopify orders.",
      };
    }
  });

export type ShopifyTestResult = {
  ok: boolean;
  shop: string | null;
  error: string | null;
};

export const testShopifyConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    shopifySyncInputSchema.pick({ storeDomain: true, accessToken: true }).parse(data),
  )
  .handler(async ({ data }): Promise<ShopifyTestResult> => {
    try {
      const host = requireAdminDomain(data.storeDomain);
      const token = requireAdminToken(data.accessToken);
      const shopRes = await shopifyGet(host, token, "shop.json");
      if (!shopRes.ok) {
        const body = await shopRes.text().catch(() => "");
        throw authError(shopRes.status, body, "shop");
      }
      const ordersRes = await shopifyGet(host, token, "orders.json?status=any&limit=1");
      if (!ordersRes.ok) {
        const body = await ordersRes.text().catch(() => "");
        throw authError(ordersRes.status, body, "orders");
      }
      return { ok: true, shop: host, error: null };
    } catch (error) {
      return {
        ok: false,
        shop: null,
        error: error instanceof Error ? error.message : "Unable to reach Shopify.",
      };
    }
  });

export const getShopifyDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
  async (): Promise<ShopifyDashboardResult> => {
    const serverConfigured =
      Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim()) &&
      Boolean(process.env["SUPABASE_URL"]?.trim());

    if (!serverConfigured) {
      return {
        summary: {
          status: "not_configured",
          method: "api",
          serverConfigured: false,
          lastSyncAt: null,
          orderCount: null,
          errorMessage: "Server synchronization is not fully configured.",
        },
        error: "Server synchronization is not fully configured.",
      };
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [countRes, latestRes] = await Promise.all([
        supabaseAdmin
          .from("orders")
          .select("order_id", { count: "exact", head: true })
          .ilike("source", "%shopify%"),
        supabaseAdmin
          .from("orders")
          .select("last_event_at")
          .ilike("source", "%shopify%")
          .order("last_event_at", { ascending: false })
          .limit(1),
      ]);

      if (countRes.error || latestRes.error) {
        return {
          summary: {
            status: "error",
            method: "api",
            serverConfigured: true,
            lastSyncAt: null,
            orderCount: null,
            errorMessage: "Unable to load Shopify synchronization data.",
          },
          error: "Unable to load Shopify synchronization data.",
        };
      }

      const orderCount = countRes.count ?? 0;
      const lastSyncAt = latestRes.data?.[0]?.last_event_at ?? null;

      return {
        summary: {
          status: orderCount > 0 ? "connected" : "configured",
          method: "api",
          serverConfigured: true,
          lastSyncAt,
          orderCount,
          errorMessage: null,
        },
        error: null,
      };
    } catch (error) {
      console.error("getShopifyDashboard failed", error);
      return {
        summary: {
          status: "error",
          method: "api",
          serverConfigured: true,
          lastSyncAt: null,
          orderCount: null,
          errorMessage: "Unable to load Shopify synchronization data.",
        },
        error: "Unable to load Shopify synchronization data.",
      };
    }
  },
);

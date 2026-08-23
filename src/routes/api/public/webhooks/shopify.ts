import { createFileRoute } from "@tanstack/react-router";

import {
  findShopifyTokenForShop,
  markShopifyShopUninstalled,
} from "@/lib/integrations/shopify/oauth.functions";
import { getShopifyAppConfig, verifyShopifyWebhookHmac } from "@/lib/integrations/shopify/oauth";
import { persistShopifyNormalizedOrders } from "@/lib/integrations/shopify/persist";
import { normalizeShopifyRestOrder } from "@/lib/integrations/shopify/shopify-normalize";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/webhooks/shopify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const config = getShopifyAppConfig();
        if (!config) return json({ error: "Shopify app is not configured" }, 503);

        const rawBody = await request.text();
        const hmac = request.headers.get("x-shopify-hmac-sha256");
        if (!verifyShopifyWebhookHmac(rawBody, hmac, config.apiSecret)) {
          return json({ error: "Unauthorized" }, 401);
        }

        const topic = request.headers.get("x-shopify-topic") ?? "";
        const shop = request.headers.get("x-shopify-shop-domain") ?? "";
        console.info("[shopify] webhook", JSON.stringify({ topic, shop: shop ? "set" : "none" }));

        if (topic === "app/uninstalled") {
          await markShopifyShopUninstalled(shop);
          return json({ ok: true });
        }

        if (
          topic !== "orders/create" &&
          topic !== "orders/updated" &&
          topic !== "orders/cancelled"
        ) {
          return json({ ok: true, ignored: topic });
        }

        const token = await findShopifyTokenForShop(shop);
        if (!token) {
          console.error("[shopify] webhook for unknown shop");
          return json({ error: "Unknown shop" }, 404);
        }

        let payload: unknown;
        try {
          payload = JSON.parse(rawBody) as unknown;
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const normalized = normalizeShopifyRestOrder(payload as never);
        if (!normalized) {
          return json({ error: "Unrecognized order payload" }, 422);
        }

        await persistShopifyNormalizedOrders([normalized]);
        return json({ ok: true, imported: 1 });
      },
    },
  },
});

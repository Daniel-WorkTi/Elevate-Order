import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { persistShopifyNormalizedOrders } from "@/lib/integrations/shopify/persist";

describe("persistShopifyNormalizedOrders workspace gate", () => {
  it("rejects persistence without workspace_id", async () => {
    await assert.rejects(
      () =>
        persistShopifyNormalizedOrders(
          [
            {
              order_id: 1,
              shopify_order_id: 1,
              status_name: "Confirmed",
              details: null,
              tracking_code: null,
              tracking_url: null,
              shipping_company: null,
              total: 10,
              currency: "EUR",
              customer_name: "A",
              phone: null,
              email: null,
              city: null,
              postal_code: null,
              address: null,
              country: null,
              product_summary: null,
              source: "Shopify",
              last_event_at: new Date().toISOString(),
              snapshot: {},
            },
          ],
          null,
        ),
      /workspace_id/i,
    );
  });
});

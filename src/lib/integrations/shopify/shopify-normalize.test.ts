import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeShopifyRestOrder } from "@/lib/integrations/shopify/shopify-normalize";

test("uses billing address and shipping line when shipping address is missing", () => {
  const order = normalizeShopifyRestOrder({
    id: 99,
    email: "a@b.com",
    financial_status: "paid",
    billing_address: {
      name: "Maria Costa",
      address1: "Calle 10",
      address2: "2B",
      city: "Madrid",
      zip: "28001",
      country: "Spain",
      phone: "+34600000000",
    },
    shipping_lines: [{ title: "Correos" }],
    line_items: [{ title: "Lamp", quantity: 1 }],
  });

  assert.ok(order);
  assert.equal(order?.customer_name, "Maria Costa");
  assert.equal(order?.address, "Calle 10, 2B");
  assert.equal(order?.city, "Madrid");
  assert.equal(order?.shipping_company, "Correos");
  assert.equal(order?.status_name, "Confirmed");
  assert.equal(order?.product_summary, "Lamp");
});

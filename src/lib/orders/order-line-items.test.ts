import assert from "node:assert/strict";
import { test } from "node:test";

import {
  lineItemsFromProductSummary,
  lineItemsFromSnapshot,
  paymentMethodFromSnapshot,
} from "@/lib/orders/order-line-items";

test("parses shopify line items from snapshot", () => {
  const items = lineItemsFromSnapshot({
    line_items: [
      {
        id: 1,
        name: "Smartwatch Pro X",
        variant_title: "Preto • 44mm",
        quantity: 1,
        price: "45.49",
        product_id: 111,
        variant_id: 222,
        image: { src: "https://cdn.shopify.com/s/files/1/watch.jpg" },
      },
    ],
  });
  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "Smartwatch Pro X");
  assert.equal(items[0]?.variant, "Preto • 44mm");
  assert.equal(items[0]?.unitPrice, 45.49);
  assert.equal(items[0]?.imageUrl, "https://cdn.shopify.com/s/files/1/watch.jpg");
  assert.equal(items[0]?.productId, 111);
});

test("falls back to product summary", () => {
  const items = lineItemsFromProductSummary("Lamp ×2", 40);
  assert.equal(items.length, 1);
  assert.equal(items[0]?.quantity, 2);
  assert.equal(items[0]?.unitPrice, 20);
});

test("reads payment method from snapshot", () => {
  assert.equal(
    paymentMethodFromSnapshot({ payment_gateway_names: ["Cash on Delivery"] }),
    "Cash on Delivery",
  );
});

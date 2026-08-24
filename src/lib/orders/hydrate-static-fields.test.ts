import assert from "node:assert/strict";
import { test } from "node:test";

import { mergeStaticFields, staticFieldsFromSnapshot } from "@/lib/orders/hydrate-static-fields";

test("hydrates customer, address and products from a Shopify REST snapshot", () => {
  const fields = staticFieldsFromSnapshot({
    id: 111,
    email: "ana@example.com",
    customer: { first_name: "Ana", last_name: "Silva", phone: "+351910000000" },
    billing_address: {
      name: "Ana Silva",
      address1: "Rua A 1",
      city: "Lisboa",
      zip: "1000-001",
      country: "Portugal",
      phone: "+351910000000",
    },
    shipping_lines: [{ title: "CTT Expresso" }],
    line_items: [{ name: "Sneakers", quantity: 2 }],
  });

  assert.equal(fields.customer_name, "Ana Silva");
  assert.equal(fields.email, "ana@example.com");
  assert.equal(fields.phone, "+351910000000");
  assert.equal(fields.address, "Rua A 1");
  assert.equal(fields.city, "Lisboa");
  assert.equal(fields.postal_code, "1000-001");
  assert.equal(fields.country, "Portugal");
  assert.equal(fields.product_summary, "Sneakers ×2");
  assert.equal(fields.shipping_company, "CTT Expresso");
});

test("keeps stored fields when the snapshot is empty", () => {
  const merged = mergeStaticFields(
    {
      customer_name: "João",
      phone: null,
      email: null,
      city: null,
      postal_code: null,
      address: null,
      country: "España",
      product_summary: null,
      shipping_company: null,
    },
    staticFieldsFromSnapshot(null),
  );
  assert.equal(merged.customer_name, "João");
  assert.equal(merged.country, "España");
});

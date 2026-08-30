import assert from "node:assert/strict";
import { test } from "node:test";

import { pickDefaultTemplate } from "@/lib/order-message";
import { defaultContentFor } from "@/lib/templates/default-templates";
import type { OperationalOrder } from "@/lib/order-domain";

function order(partial: Partial<OperationalOrder>): OperationalOrder {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    order_id: 123,
    shopify_order_id: null,
    status_id: null,
    status_name: "Waiting",
    details: null,
    tracking_code: null,
    tracking_url: null,
    shipping_company: null,
    total: 29.99,
    currency: "EUR",
    customer_name: "Test",
    phone: "+351900000000",
    email: null,
    country: "PT",
    city: null,
    postal_code: null,
    address: null,
    source: "dropi",
    last_event_at: null,
    created_at: null,
    product_summary: null,
    ...partial,
  };
}

test("waiting unconfirmed order defaults to confirmation template", () => {
  assert.equal(pickDefaultTemplate(order({ status_name: "Waiting" })), "confirmation");
});

test("confirmed order does not default to confirmation request", () => {
  assert.equal(
    pickDefaultTemplate(
      order({
        status_name: "Waiting",
        confirmed_at: "2026-08-29T00:00:00.000Z",
      }),
    ),
    "follow_up",
  );
});

test("confirmation template instructs customer what to reply", () => {
  const pt = defaultContentFor("confirmation", "pt");
  assert.match(pt, /Para confirmar o envio, responda:\s*\nSIM/i);
  assert.match(pt, /Para cancelar, responda:\s*\nNÃO/i);
});

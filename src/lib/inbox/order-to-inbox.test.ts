import assert from "node:assert/strict";
import { test } from "node:test";

import { operationalOrderToInboxItem } from "@/lib/inbox/order-to-inbox";
import type { OperationalOrder } from "@/lib/order-domain";

function order(overrides: Partial<OperationalOrder> = {}): OperationalOrder {
  return {
    id: "1",
    order_id: 1001,
    shopify_order_id: null,
    status_id: null,
    status_name: "Incident",
    details: "Wrong address",
    tracking_code: "TRK",
    tracking_url: null,
    shipping_company: "GLS",
    total: 50,
    currency: "EUR",
    customer_name: "Ana",
    phone: "+351910000000",
    country: "Portugal",
    source: "Dropi Pro",
    last_event_at: "2026-08-16T10:00:00.000Z",
    created_at: "2026-08-16T09:00:00.000Z",
    product_summary: "Sneakers",
    ...overrides,
  };
}

test("incident Dropi orders enter the inbox as critical", () => {
  const item = operationalOrderToInboxItem(order());
  assert.ok(item);
  assert.equal(item?.id, "1001");
  assert.equal(item?.supply, "dropi");
  assert.equal(item?.priority, "critical");
  assert.equal(item?.countryCode, "pt");
  assert.equal(item?.product, "Sneakers");
});

test("waiting Dropea orders enter as waiting", () => {
  const item = operationalOrderToInboxItem(
    order({ source: "Dropea", status_name: "Waiting", details: "No reply" }),
  );
  assert.equal(item?.supply, "dropea");
  assert.equal(item?.priority, "waiting");
});

test("messaged orders enter as follow-up", () => {
  const item = operationalOrderToInboxItem(order({ status_name: "Messaged", details: null }));
  assert.equal(item?.priority, "followup");
});

test("delivered orders stay out of the inbox queue", () => {
  assert.equal(operationalOrderToInboxItem(order({ status_name: "Delivered", details: null })), null);
});

test("confirmed Shopify orders enter the Dropi inbox as waiting", () => {
  const item = operationalOrderToInboxItem(
    order({ source: "Shopify", status_name: "Confirmed", details: null }),
  );
  assert.equal(item?.supply, "dropi");
  assert.equal(item?.priority, "waiting");
});

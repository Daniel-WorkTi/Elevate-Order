import assert from "node:assert/strict";
import { test } from "node:test";

import { getOrderStatus, supplyMatchesSource } from "@/lib/order-domain";

test("confirmed_at overrides supply waiting status", () => {
  const status = getOrderStatus({
    status_name: "Waiting",
    details: "Pendente em confirmação",
    confirmed_at: "2026-08-29T10:00:00.000Z",
  });
  assert.equal(status.key, "confirmed");
  assert.equal(status.label, "Confirmed");
});

test("without confirmed_at, supply regex still applies", () => {
  const status = getOrderStatus({
    status_name: "Waiting",
    details: null,
    confirmed_at: null,
  });
  assert.equal(status.key, "waiting");
});

test("confirmed_at wins even when supply says cancelled pattern would match later rules", () => {
  const status = getOrderStatus({
    status_name: "Pendente",
    details: null,
    confirmed_at: "2026-08-29T10:00:00.000Z",
  });
  assert.equal(status.key, "confirmed");
});

test("last_whatsapp_contact_at yields messaged unless terminal/incident", () => {
  assert.equal(
    getOrderStatus({
      status_name: "Waiting",
      details: null,
      last_whatsapp_contact_at: "2026-09-20T12:00:00.000Z",
    }).key,
    "messaged",
  );
  assert.equal(
    getOrderStatus({
      status_name: "Incident",
      details: "Failed delivery",
      last_whatsapp_contact_at: "2026-09-20T12:00:00.000Z",
    }).key,
    "incident",
  );
});

test("supplyMatchesSource keeps Dropi and Dropea queues isolated", () => {
  assert.equal(supplyMatchesSource("dropi", "Dropi Pro"), true);
  assert.equal(supplyMatchesSource("dropi", "Dropea"), false);
  assert.equal(supplyMatchesSource("dropea", "Dropea"), true);
  assert.equal(supplyMatchesSource("dropea", "Dropi Pro"), false);
  assert.equal(supplyMatchesSource("dropi", "Shopify"), false);
});

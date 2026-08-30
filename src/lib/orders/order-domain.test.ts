import assert from "node:assert/strict";
import { test } from "node:test";

import { getOrderStatus } from "@/lib/order-domain";

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

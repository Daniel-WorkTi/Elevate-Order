import assert from "node:assert/strict";
import { test } from "node:test";

import {
  deriveCodOperationStatus,
  isCodConfirmReply,
  isDropiCodPendingAction,
  isDropiExternallyConfirmed,
  isDropiOrder,
  isDropiSupplySource,
} from "@/lib/orders/cod-operation";

function dropiConfirm(overrides: Record<string, unknown> = {}) {
  return {
    source: "Dropi Pro",
    cod_reply_intent: "confirm" as const,
    cod_handled_at: null,
    status_name: "Waiting",
    details: null,
    ...overrides,
  };
}

test("A: confirm + Dropi + unhandled → pending queue", () => {
  const order = dropiConfirm();
  assert.equal(isDropiCodPendingAction(order), true);
  assert.equal(deriveCodOperationStatus(order), "pending_action");
});

test("B: confirm + handled → not in pending queue", () => {
  const order = dropiConfirm({ cod_handled_at: "2026-08-30T12:00:00Z" });
  assert.equal(isDropiCodPendingAction(order), false);
  assert.equal(deriveCodOperationStatus(order), "handled");
});

test("C: reject → not applicable for Dropi operation queue", () => {
  const order = dropiConfirm({ cod_reply_intent: "reject" });
  assert.equal(isDropiCodPendingAction(order), false);
  assert.equal(deriveCodOperationStatus(order), "not_applicable");
  assert.equal(isCodConfirmReply(order), false);
});

test("D: needs_operator → not applicable", () => {
  const order = dropiConfirm({ cod_reply_intent: "needs_operator" });
  assert.equal(isDropiCodPendingAction(order), false);
  assert.equal(deriveCodOperationStatus(order), "not_applicable");
});

test("G: non-Dropi order → not in Dropi queue", () => {
  assert.equal(isDropiSupplySource("Dropi Pro"), true);
  assert.equal(isDropiSupplySource("Dropea"), false);
  assert.equal(isDropiSupplySource("shopify"), false);

  const order = {
    source: "Dropea",
    cod_reply_intent: "confirm" as const,
    cod_handled_at: null,
    status_name: "Waiting",
    details: null,
  };
  assert.equal(isDropiOrder(order), false);
  assert.equal(isDropiCodPendingAction(order), false);
});

test("H: external Dropi confirmation heuristic", () => {
  assert.equal(isDropiExternallyConfirmed({ status_name: "Confirmed", details: null }), true);
  assert.equal(isDropiExternallyConfirmed({ status_name: "Aceptado", details: null }), true);
  assert.equal(isDropiExternallyConfirmed({ status_name: "Cancelled", details: null }), false);
  assert.equal(isDropiExternallyConfirmed({ status_name: "Waiting", details: null }), false);
});

test("I: external webhook after handled keeps handled timestamp on order", () => {
  const handledAt = "2026-08-30T12:42:00Z";
  const order = dropiConfirm({
    cod_handled_at: handledAt,
    status_name: "Confirmed",
    details: "Accepted in Dropi",
  });
  assert.equal(order.cod_handled_at, handledAt);
  assert.equal(deriveCodOperationStatus(order), "externally_confirmed");
});

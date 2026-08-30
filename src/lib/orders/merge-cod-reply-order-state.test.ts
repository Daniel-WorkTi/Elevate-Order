import assert from "node:assert/strict";
import { test } from "node:test";

import {
  mergeCodReplyOrderState,
  shouldAttemptCodAutoConfirm,
} from "@/lib/orders/merge-cod-reply-order-state";

test("SIM → Obrigado = continua CONFIRM", () => {
  const merge = mergeCodReplyOrderState({
    currentIntent: "confirm",
    messageIntent: "needs_operator",
    messageReason: "no_safe_match",
    isHandled: false,
  });
  assert.equal(merge.nextIntent, "confirm");
  assert.equal(merge.shouldUpdate, false);
  assert.equal(merge.conflict, false);
});

test("SIM → SIM = continua CONFIRM (idempotente)", () => {
  const merge = mergeCodReplyOrderState({
    currentIntent: "confirm",
    messageIntent: "confirm",
    messageReason: "exact_confirm_phrase",
    isHandled: false,
  });
  assert.equal(merge.nextIntent, "confirm");
  assert.equal(merge.shouldUpdate, false);
});

test("SIM → NÃO = conflict / NEEDS_OPERATOR", () => {
  const merge = mergeCodReplyOrderState({
    currentIntent: "confirm",
    messageIntent: "reject",
    messageReason: "exact_reject_phrase",
    isHandled: false,
  });
  assert.equal(merge.nextIntent, "needs_operator");
  assert.equal(merge.shouldUpdate, true);
  assert.equal(merge.conflict, true);
  assert.equal(merge.conflictReason, "cod_state_conflict");
});

test("NÃO → SIM = conflict / NEEDS_OPERATOR", () => {
  const merge = mergeCodReplyOrderState({
    currentIntent: "reject",
    messageIntent: "confirm",
    messageReason: "exact_confirm_phrase",
    isHandled: false,
  });
  assert.equal(merge.nextIntent, "needs_operator");
  assert.equal(merge.shouldUpdate, true);
  assert.equal(merge.conflict, true);
});

test("awaiting → SIM = estabelece CONFIRM", () => {
  const merge = mergeCodReplyOrderState({
    currentIntent: null,
    messageIntent: "confirm",
    messageReason: "exact_confirm_phrase",
    isHandled: false,
  });
  assert.equal(merge.nextIntent, "confirm");
  assert.equal(merge.shouldUpdate, true);
});

test("awaiting → Obrigado = NEEDS_OPERATOR (sem estado decisivo ainda)", () => {
  const merge = mergeCodReplyOrderState({
    currentIntent: null,
    messageIntent: "needs_operator",
    messageReason: "no_safe_match",
    isHandled: false,
  });
  assert.equal(merge.nextIntent, "needs_operator");
  assert.equal(merge.shouldUpdate, true);
});

test("NEEDS_OPERATOR → SIM = passa a CONFIRM", () => {
  const merge = mergeCodReplyOrderState({
    currentIntent: "needs_operator",
    messageIntent: "confirm",
    messageReason: "exact_confirm_phrase",
    isHandled: false,
  });
  assert.equal(merge.nextIntent, "confirm");
  assert.equal(merge.shouldUpdate, true);
});

test("SIM → handled → Obrigado = continua handled / CONFIRM", () => {
  const merge = mergeCodReplyOrderState({
    currentIntent: "confirm",
    messageIntent: "needs_operator",
    messageReason: "no_safe_match",
    isHandled: true,
  });
  assert.equal(merge.nextIntent, "confirm");
  assert.equal(merge.shouldUpdate, false);
  assert.equal(merge.conflict, false);
});

test("SIM → handled → NÃO = não desfaz handled; sinaliza conflito", () => {
  const merge = mergeCodReplyOrderState({
    currentIntent: "confirm",
    messageIntent: "reject",
    messageReason: "exact_reject_phrase",
    isHandled: true,
  });
  assert.equal(merge.nextIntent, "confirm");
  assert.equal(merge.shouldUpdate, false);
  assert.equal(merge.conflict, true);
  assert.equal(merge.conflictReason, "cod_state_conflict_after_handled");
});

test("auto-confirm só na primeira CONFIRM que estabelece estado", () => {
  const first = mergeCodReplyOrderState({
    currentIntent: null,
    messageIntent: "confirm",
    messageReason: "exact_confirm_phrase",
    isHandled: false,
  });
  assert.equal(
    shouldAttemptCodAutoConfirm({
      messageIntent: "confirm",
      merge: first,
      autoConfirmEnabled: true,
      hasOrder: true,
    }),
    true,
  );

  const repeat = mergeCodReplyOrderState({
    currentIntent: "confirm",
    messageIntent: "confirm",
    messageReason: "exact_confirm_phrase",
    isHandled: false,
  });
  assert.equal(
    shouldAttemptCodAutoConfirm({
      messageIntent: "confirm",
      merge: repeat,
      autoConfirmEnabled: true,
      hasOrder: true,
    }),
    false,
  );
});

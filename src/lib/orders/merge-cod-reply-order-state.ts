import type { CodReplyIntent } from "@/lib/order-domain";

export type MergeCodReplyOrderStateInput = {
  /** Current orders.cod_reply_intent (operational COD reply state). */
  currentIntent: CodReplyIntent | null | undefined;
  /** Classification of this inbound message (always logged to events). */
  messageIntent: CodReplyIntent;
  messageReason: string;
  /** When set, inbound must never revert operator handled state. */
  isHandled: boolean;
};

export type MergeCodReplyOrderStateResult = {
  nextIntent: CodReplyIntent | null;
  shouldUpdate: boolean;
  /** Cross-intent contradiction (confirm↔reject), including after handled. */
  conflict: boolean;
  conflictReason: string | null;
};

/**
 * Merge inbound classification into order-level COD reply state.
 * Per-message audit stays in order_confirmation_events — this governs orders.cod_reply_* only.
 */
export function mergeCodReplyOrderState(
  input: MergeCodReplyOrderStateInput,
): MergeCodReplyOrderStateResult {
  const current = input.currentIntent ?? null;
  const { messageIntent, isHandled } = input;

  const crossConflict =
    (current === "confirm" && messageIntent === "reject") ||
    (current === "reject" && messageIntent === "confirm");

  if (isHandled) {
    return {
      nextIntent: current,
      shouldUpdate: false,
      conflict: crossConflict,
      conflictReason: crossConflict ? "cod_state_conflict_after_handled" : null,
    };
  }

  if (!current) {
    return {
      nextIntent: messageIntent,
      shouldUpdate: true,
      conflict: false,
      conflictReason: null,
    };
  }

  if (current === messageIntent) {
    return {
      nextIntent: current,
      shouldUpdate: false,
      conflict: false,
      conflictReason: null,
    };
  }

  if (crossConflict) {
    return {
      nextIntent: "needs_operator",
      shouldUpdate: true,
      conflict: true,
      conflictReason: "cod_state_conflict",
    };
  }

  if (messageIntent === "needs_operator") {
    return {
      nextIntent: current,
      shouldUpdate: false,
      conflict: false,
      conflictReason: null,
    };
  }

  if (current === "needs_operator") {
    return {
      nextIntent: messageIntent,
      shouldUpdate: true,
      conflict: false,
      conflictReason: null,
    };
  }

  return {
    nextIntent: current,
    shouldUpdate: false,
    conflict: false,
    conflictReason: null,
  };
}

/** Effective intent for auto-confirm — only first establishing confirm applies. */
export function shouldAttemptCodAutoConfirm(input: {
  messageIntent: CodReplyIntent;
  merge: MergeCodReplyOrderStateResult;
  autoConfirmEnabled: boolean;
  hasOrder: boolean;
}): boolean {
  return (
    input.autoConfirmEnabled &&
    input.hasOrder &&
    input.messageIntent === "confirm" &&
    input.merge.shouldUpdate &&
    input.merge.nextIntent === "confirm"
  );
}

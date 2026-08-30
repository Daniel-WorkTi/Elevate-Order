import {
  confirmOrderCod,
  recordConfirmationClassification,
} from "@/lib/orders/confirm-order.server";
import {
  mergeCodReplyOrderState,
  shouldAttemptCodAutoConfirm,
} from "@/lib/orders/merge-cod-reply-order-state";
import {
  classifyConfirmationIntent,
  mergeConfirmationKeywordConfig,
} from "@/lib/whatsapp/inbound/classify-confirmation-intent";

export type ProcessInboundConfirmationInput = {
  workspaceId: string;
  messageId: string;
  conversationId: string;
  text: string;
  orderId: string | null;
  ambiguousOrderCount: number;
};

export type ProcessInboundConfirmationResult = {
  intent: "confirm" | "reject" | "needs_operator";
  reason: string;
  classified: boolean;
  confirmed: boolean;
  alreadyConfirmed: boolean;
  codStateUpdated: boolean;
  codConflict: boolean;
};

export async function processInboundConfirmation(
  input: ProcessInboundConfirmationInput,
): Promise<ProcessInboundConfirmationResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: workspace } = await supabaseAdmin
    .from("workspaces")
    .select("whatsapp_auto_confirm, whatsapp_confirm_keywords, whatsapp_reject_keywords")
    .eq("id", input.workspaceId)
    .maybeSingle();

  const keywordConfig = mergeConfirmationKeywordConfig({
    confirmPhrases: workspace?.whatsapp_confirm_keywords ?? [],
    rejectPhrases: workspace?.whatsapp_reject_keywords ?? [],
  });

  let classification = classifyConfirmationIntent(input.text, keywordConfig);

  if (input.ambiguousOrderCount > 1) {
    classification = {
      intent: "needs_operator",
      reason: "ambiguous_orders",
      normalizedText: classification.normalizedText,
    };
  } else if (!input.orderId) {
    classification = {
      intent: "needs_operator",
      reason: "no_linked_order",
      normalizedText: classification.normalizedText,
    };
  }

  const autoConfirmEnabled = workspace?.whatsapp_auto_confirm === true;

  let currentIntent: "confirm" | "reject" | "needs_operator" | null = null;
  let isHandled = false;

  if (input.orderId) {
    const { data: orderRow } = await supabaseAdmin
      .from("orders")
      .select("cod_reply_intent, cod_handled_at")
      .eq("id", input.orderId)
      .eq("workspace_id", input.workspaceId)
      .maybeSingle();

    currentIntent = orderRow?.cod_reply_intent ?? null;
    isHandled = Boolean(orderRow?.cod_handled_at);
  }

  const merge = mergeCodReplyOrderState({
    currentIntent,
    messageIntent: classification.intent,
    messageReason: classification.reason,
    isHandled,
  });

  const eventReason = merge.conflictReason ?? classification.reason;

  await recordConfirmationClassification({
    workspaceId: input.workspaceId,
    messageId: input.messageId,
    conversationId: input.conversationId,
    intent: classification.intent,
    reason: eventReason,
    orderUuid: input.orderId,
    source: "system",
  });

  let codStateUpdated = false;

  if (input.orderId && merge.shouldUpdate && merge.nextIntent) {
    const { error: replyError } = await supabaseAdmin
      .from("orders")
      .update({
        cod_reply_intent: merge.nextIntent,
        cod_reply_at: new Date().toISOString(),
        cod_reply_text: input.text.trim().slice(0, 500) || null,
      })
      .eq("id", input.orderId)
      .eq("workspace_id", input.workspaceId)
      .is("cod_handled_at", null);

    if (replyError) {
      console.error("[confirmation] cod reply update failed", replyError.message);
    } else {
      codStateUpdated = true;
    }
  } else if (merge.conflict && isHandled) {
    console.warn("[confirmation] cod state conflict after handled", {
      workspaceId: input.workspaceId,
      orderId: input.orderId,
      messageId: input.messageId,
      currentIntent,
      messageIntent: classification.intent,
    });
  }

  if (
    !shouldAttemptCodAutoConfirm({
      messageIntent: classification.intent,
      merge,
      autoConfirmEnabled,
      hasOrder: Boolean(input.orderId),
    })
  ) {
    return {
      intent: classification.intent,
      reason: classification.reason,
      classified: true,
      confirmed: false,
      alreadyConfirmed: false,
      codStateUpdated,
      codConflict: merge.conflict,
    };
  }

  try {
    const result = await confirmOrderCod({
      workspaceId: input.workspaceId,
      orderUuid: input.orderId!,
      source: "whatsapp_auto",
      conversationId: input.conversationId,
      messageId: input.messageId,
      intentReason: classification.reason,
    });

    return {
      intent: classification.intent,
      reason: classification.reason,
      classified: true,
      confirmed: result.applied,
      alreadyConfirmed: result.alreadyConfirmed,
      codStateUpdated,
      codConflict: merge.conflict,
    };
  } catch (error) {
    console.error("[confirmation] auto confirm failed", {
      workspaceId: input.workspaceId,
      orderId: input.orderId,
      messageId: input.messageId,
      error,
    });
    return {
      intent: classification.intent,
      reason: classification.reason,
      classified: true,
      confirmed: false,
      alreadyConfirmed: false,
      codStateUpdated,
      codConflict: merge.conflict,
    };
  }
}

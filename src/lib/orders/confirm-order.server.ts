export type ConfirmOrderCodSource = "whatsapp_auto" | "operator";

export type ConfirmOrderCodInput = {
  workspaceId: string;
  orderUuid: string;
  source: ConfirmOrderCodSource;
  conversationId?: string | null;
  messageId?: string | null;
  actorUserId?: string | null;
  intentReason?: string | null;
};

export type ConfirmOrderCodResult = {
  applied: boolean;
  alreadyConfirmed: boolean;
  orderUuid: string;
  confirmationEventId: string | null;
};

type RpcRow = {
  applied: boolean;
  already_confirmed: boolean;
  order_uuid: string;
  confirmation_event_id: string | null;
};

export async function confirmOrderCod(
  input: ConfirmOrderCodInput,
): Promise<ConfirmOrderCodResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin.rpc("confirm_order_cod", {
    p_workspace_id: input.workspaceId,
    p_order_uuid: input.orderUuid,
    p_source: input.source,
    p_conversation_id: input.conversationId ?? null,
    p_message_id: input.messageId ?? null,
    p_actor_user_id: input.actorUserId ?? null,
    p_intent_reason: input.intentReason ?? null,
  });

  if (error) throw error;

  const row = (data as RpcRow[] | null)?.[0];
  if (!row) throw new Error("confirm_order_cod_empty_result");

  return {
    applied: row.applied,
    alreadyConfirmed: row.already_confirmed,
    orderUuid: row.order_uuid,
    confirmationEventId: row.confirmation_event_id,
  };
}

type ClassifyRpcRow = {
  inserted: boolean;
  event_id: string;
};

export async function recordConfirmationClassification(input: {
  workspaceId: string;
  messageId: string;
  conversationId: string;
  intent: "confirm" | "reject" | "needs_operator";
  reason?: string | null;
  orderUuid?: string | null;
  source?: "whatsapp_auto" | "operator" | "system";
}): Promise<{ inserted: boolean; eventId: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin.rpc("record_confirmation_classification", {
    p_workspace_id: input.workspaceId,
    p_message_id: input.messageId,
    p_conversation_id: input.conversationId,
    p_intent: input.intent,
    p_reason: input.reason ?? null,
    p_order_uuid: input.orderUuid ?? null,
    p_source: input.source ?? "system",
  });

  if (error) throw error;

  const row = (data as ClassifyRpcRow[] | null)?.[0];
  if (!row) throw new Error("record_confirmation_classification_empty_result");

  return { inserted: row.inserted, eventId: row.event_id };
}

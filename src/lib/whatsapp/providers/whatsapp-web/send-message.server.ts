import type { GatewaySendMessageResult } from "@/lib/whatsapp/gateway-client.server";
import { gatewaySendMessage } from "@/lib/whatsapp/gateway-client.server";
import { signGatewayActionToken } from "@/lib/whatsapp/gateway-jwt.server";
import { WhatsAppUserError, toWhatsAppUserError } from "@/lib/whatsapp/errors";
import { normalizePhoneToE164 } from "@/lib/whatsapp/phone-e164.server";
import { samePhoneE164 } from "@/lib/whatsapp/phone-same.server";
import { getWhatsAppWebConnectionStatus } from "@/lib/whatsapp/providers/whatsapp-web/connection-status.server";

const MAX_TEXT_LENGTH = 4096;

export type SendWhatsAppTextMessageInput = {
  workspaceId: string;
  userId: string;
  orderId?: string | null;
  conversationId?: string | null;
  clientMessageId: string;
  recipientPhone: string;
  text: string;
};

export type SendWhatsAppTextMessageResult = {
  ok: true;
  messageId: string;
  clientMessageId: string;
  status: "sent" | "queued" | "failed";
  whatsappMessageId: string | null;
  deliveryHint?: "recipient_is_connected_account" | null;
};

type EnqueueRow = {
  message_id: string;
  should_send: boolean;
  status: string;
  whatsapp_message_id: string | null;
};

export async function runSendWhatsAppTextMessage(
  input: SendWhatsAppTextMessageInput,
): Promise<SendWhatsAppTextMessageResult> {
  const text = input.text.trim();
  if (!text) {
    throw new WhatsAppUserError("validation_failed", "A mensagem não pode estar vazia.");
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw new WhatsAppUserError("validation_failed", "A mensagem é demasiado longa.");
  }

  const recipientE164 = normalizePhoneToE164(input.recipientPhone);
  if (!recipientE164) {
    throw new WhatsAppUserError(
      "validation_failed",
      "Número de telefone inválido. Use formato internacional (ex.: +351912345678).",
    );
  }

  const connection = await getWhatsAppWebConnectionStatus(input.workspaceId);
  if (!connection.configured || connection.status !== "connected" || !connection.connectionId) {
    throw new WhatsAppUserError(
      "gateway_unavailable",
      "WhatsApp não está ligado. Ligue a conta em Conexões para enviar directamente.",
    );
  }

  const recipientIsConnectedAccount = samePhoneE164(
    recipientE164,
    connection.displayPhoneNumber,
  );

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (input.orderId) {
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, workspace_id")
      .eq("id", input.orderId)
      .eq("workspace_id", input.workspaceId)
      .maybeSingle();

    if (orderError || !order) {
      throw new WhatsAppUserError("validation_failed", "Pedido não encontrado neste workspace.");
    }
  }

  const { data: enqueueRows, error: enqueueError } = await supabaseAdmin.rpc(
    "enqueue_whatsapp_outbound_message",
    {
      p_workspace_id: input.workspaceId,
      p_connection_id: connection.connectionId,
      p_order_id: input.orderId ?? null,
      p_client_message_id: input.clientMessageId,
      p_recipient_phone_e164: recipientE164,
      p_message_body: text,
    },
  );

  if (enqueueError) {
    throw toWhatsAppUserError(enqueueError);
  }

  const enqueue = (enqueueRows as EnqueueRow[] | null)?.[0];
  if (!enqueue) {
    throw new WhatsAppUserError("generic", "Não foi possível preparar o envio.");
  }

  if (!enqueue.should_send) {
    const { data: latest } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("status, whatsapp_message_id")
      .eq("id", enqueue.message_id)
      .eq("workspace_id", input.workspaceId)
      .maybeSingle();

    const status = latest?.status ?? enqueue.status;
    return {
      ok: true,
      messageId: enqueue.message_id,
      clientMessageId: input.clientMessageId,
      status: status === "sent" ? "sent" : status === "failed" ? "failed" : "queued",
      whatsappMessageId: latest?.whatsapp_message_id ?? enqueue.whatsapp_message_id,
      deliveryHint: recipientIsConnectedAccount ? "recipient_is_connected_account" : null,
    };
  }

  try {
    const sendToken = await signGatewayActionToken({
      sub: input.userId,
      workspace_id: input.workspaceId,
      connection_id: connection.connectionId,
      action: "message:send",
    });

    const gatewayResult: GatewaySendMessageResult = await gatewaySendMessage(sendToken, {
      connectionId: connection.connectionId,
      to: recipientE164,
      type: "text",
      text,
    });

    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("whatsapp_messages")
      .update({
        status: "sent",
        whatsapp_message_id: gatewayResult.whatsappMessageId,
        sent_at: now,
        meta_error_code: null,
        meta_error_message: null,
        failed_at: null,
      })
      .eq("id", enqueue.message_id)
      .eq("workspace_id", input.workspaceId);

    if (updateError) {
      console.error("[whatsapp] sent update failed", updateError.message);
    }

    const convId =
      input.conversationId ??
      (await resolveOutboundConversationId(
        supabaseAdmin,
        input.workspaceId,
        connection.connectionId,
        recipientE164,
        input.orderId ?? null,
      ));

    if (convId) {
      await linkOutboundToConversation(supabaseAdmin, {
        workspaceId: input.workspaceId,
        conversationId: convId,
        messageId: enqueue.message_id,
        preview: text,
      });
    }

    return {
      ok: true,
      messageId: enqueue.message_id,
      clientMessageId: input.clientMessageId,
      status: "sent",
      whatsappMessageId: gatewayResult.whatsappMessageId,
      deliveryHint: recipientIsConnectedAccount ? "recipient_is_connected_account" : null,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "send_failed";
    const now = new Date().toISOString();

    await supabaseAdmin
      .from("whatsapp_messages")
      .update({
        status: "failed",
        meta_error_code: errMessage.slice(0, 120),
        meta_error_message: "Outbound send failed",
        failed_at: now,
      })
      .eq("id", enqueue.message_id)
      .eq("workspace_id", input.workspaceId);

    throw toWhatsAppUserError(error);
  }
}

async function resolveOutboundConversationId(
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  workspaceId: string,
  connectionId: string,
  recipientE164: string,
  orderId: string | null,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc("ensure_whatsapp_conversation", {
    p_workspace_id: workspaceId,
    p_connection_id: connectionId,
    p_customer_phone_e164: recipientE164,
    p_order_id: orderId,
  });
  if (error) {
    console.error("[whatsapp] ensure conversation failed", error.message);
    return null;
  }
  return typeof data === "string" ? data : null;
}

async function linkOutboundToConversation(
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  input: {
    workspaceId: string;
    conversationId: string;
    messageId: string;
    preview: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  await supabaseAdmin
    .from("whatsapp_messages")
    .update({ conversation_id: input.conversationId })
    .eq("id", input.messageId)
    .eq("workspace_id", input.workspaceId);

  await supabaseAdmin
    .from("whatsapp_conversations")
    .update({
      last_message_at: now,
      last_message_preview: input.preview.slice(0, 240),
    })
    .eq("id", input.conversationId)
    .eq("workspace_id", input.workspaceId);
}

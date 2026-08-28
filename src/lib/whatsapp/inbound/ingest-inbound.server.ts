import type { InboundIngestResult, NormalizedInboundMessage } from "@/lib/whatsapp/inbound/types";
import { matchOrderForInboundPhone } from "@/lib/whatsapp/inbound/order-match.server";
import { isE164Phone } from "@/lib/whatsapp/domain-types";

type RpcRow = {
  inserted: boolean;
  message_id: string;
  conversation_id: string;
  duplicate: boolean;
};

export async function ingestInboundMessage(
  event: NormalizedInboundMessage,
): Promise<InboundIngestResult> {
  if (event.provider !== "whatsapp_web") {
    throw new Error("unsupported_provider");
  }
  if (!isE164Phone(event.from)) {
    throw new Error("invalid_sender_phone");
  }
  if (!event.text.trim()) {
    throw new Error("empty_message");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: connection, error: connError } = await supabaseAdmin
    .from("whatsapp_connections")
    .select("id, workspace_id, provider")
    .eq("id", event.connectionId)
    .eq("workspace_id", event.workspaceId)
    .eq("provider", "whatsapp_web")
    .maybeSingle();

  if (connError || !connection) {
    throw new Error("connection_not_found");
  }

  const messageAt = event.timestamp || new Date().toISOString();

  const { data: rpcRows, error: rpcError } = await supabaseAdmin.rpc(
    "upsert_whatsapp_inbound_message",
    {
      p_workspace_id: event.workspaceId,
      p_connection_id: event.connectionId,
      p_external_message_id: event.externalMessageId,
      p_sender_phone_e164: event.from,
      p_message_body: event.text,
      p_message_at: messageAt,
    },
  );

  if (rpcError) throw rpcError;

  const row = (rpcRows as RpcRow[] | null)?.[0];
  if (!row) {
    throw new Error("inbound_ingest_failed");
  }

  if (row.duplicate) {
    return {
      ok: true,
      inserted: false,
      duplicate: true,
      messageId: row.message_id,
      conversationId: row.conversation_id,
      orderId: null,
      ambiguousOrderCount: 0,
    };
  }

  const match = await matchOrderForInboundPhone(event.workspaceId, event.from);

  if (match.orderId && row.conversation_id) {
    await supabaseAdmin
      .from("whatsapp_conversations")
      .update({ order_id: match.orderId })
      .eq("id", row.conversation_id)
      .eq("workspace_id", event.workspaceId)
      .is("order_id", null);

    await supabaseAdmin
      .from("whatsapp_messages")
      .update({ order_id: match.orderId })
      .eq("id", row.message_id)
      .eq("workspace_id", event.workspaceId);
  }

  return {
    ok: true,
    inserted: row.inserted,
    duplicate: false,
    messageId: row.message_id,
    conversationId: row.conversation_id,
    orderId: match.orderId,
    ambiguousOrderCount: match.ambiguousOrderCount,
  };
}

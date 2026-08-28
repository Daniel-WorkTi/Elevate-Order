import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { formatOrderId, type OperationalOrder } from "@/lib/order-domain";
import { authorizeWorkspaceInput } from "@/lib/workspace/authorize-workspace-input";
import { isWorkspaceAccessError } from "@/lib/workspace/require-workspace-access";
import { runSendWhatsAppTextMessage } from "@/lib/whatsapp/providers/whatsapp-web/send-message.server";
import { toWhatsAppUserError } from "@/lib/whatsapp/errors";

export type WhatsAppConversationListItem = {
  id: string;
  customerPhone: string;
  orderId: string | null;
  orderLabel: string | null;
  customerName: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  ambiguousOrderCount: number;
};

export type WhatsAppConversationMessage = {
  id: string;
  direction: "inbound" | "outbound";
  body: string | null;
  status: string;
  createdAt: string;
};

export type WhatsAppConversationDetail = {
  conversation: WhatsAppConversationListItem;
  messages: WhatsAppConversationMessage[];
};

const workspaceInput = z.object({
  workspaceId: z.string().uuid(),
});

const conversationInput = workspaceInput.extend({
  conversationId: z.string().uuid(),
});

const sendInput = conversationInput.extend({
  clientMessageId: z.string().uuid(),
  text: z.string().min(1).max(4096),
});

export const queryWhatsAppConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => workspaceInput.parse(data))
  .handler(
    async ({ data, context }): Promise<{ conversations: WhatsAppConversationListItem[] }> => {
      try {
        const authorized = await authorizeWorkspaceInput(context.userId, data.workspaceId);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: rows, error } = await supabaseAdmin
          .from("whatsapp_conversations")
          .select(
            "id, customer_phone_e164, order_id, last_message_preview, last_message_at, unread_count",
          )
          .eq("workspace_id", authorized.id)
          .eq("status", "open")
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .limit(200);

        if (error) throw error;

        const orderIds = [
          ...new Set((rows ?? []).map((r) => r.order_id).filter(Boolean)),
        ] as string[];
        const ordersById = new Map<string, Pick<OperationalOrder, "order_id" | "customer_name">>();

        if (orderIds.length > 0) {
          const { data: orders } = await supabaseAdmin
            .from("orders")
            .select("id, order_id, customer_name")
            .eq("workspace_id", authorized.id)
            .in("id", orderIds);
          for (const order of orders ?? []) {
            ordersById.set(order.id, order);
          }
        }

        const conversations: WhatsAppConversationListItem[] = await Promise.all(
          (rows ?? []).map(async (row) => {
            const linked = row.order_id ? ordersById.get(row.order_id) : null;
            let ambiguousOrderCount = 0;
            if (!row.order_id) {
              const { matchOrderForInboundPhone } =
                await import("@/lib/whatsapp/inbound/order-match.server");
              const match = await matchOrderForInboundPhone(authorized.id, row.customer_phone_e164);
              ambiguousOrderCount = match.ambiguousOrderCount;
            }

            return {
              id: row.id,
              customerPhone: row.customer_phone_e164,
              orderId: row.order_id,
              orderLabel: linked ? formatOrderId(linked) : null,
              customerName: linked?.customer_name ?? null,
              lastMessagePreview: row.last_message_preview,
              lastMessageAt: row.last_message_at,
              unreadCount: row.unread_count ?? 0,
              ambiguousOrderCount,
            };
          }),
        );

        return { conversations };
      } catch (error) {
        if (isWorkspaceAccessError(error)) throw error;
        console.error("[inbox] queryWhatsAppConversations failed", error);
        return { conversations: [] };
      }
    },
  );

export const getWhatsAppConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => conversationInput.parse(data))
  .handler(async ({ data, context }): Promise<WhatsAppConversationDetail | null> => {
    try {
      const authorized = await authorizeWorkspaceInput(context.userId, data.workspaceId);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: conv, error: convError } = await supabaseAdmin
        .from("whatsapp_conversations")
        .select(
          "id, customer_phone_e164, order_id, last_message_preview, last_message_at, unread_count",
        )
        .eq("id", data.conversationId)
        .eq("workspace_id", authorized.id)
        .maybeSingle();

      if (convError || !conv) return null;

      await supabaseAdmin.rpc("mark_whatsapp_conversation_read", {
        p_workspace_id: authorized.id,
        p_conversation_id: data.conversationId,
      });

      const { data: messages, error: msgError } = await supabaseAdmin
        .from("whatsapp_messages")
        .select("id, direction, message_body, status, created_at")
        .eq("workspace_id", authorized.id)
        .eq("conversation_id", data.conversationId)
        .order("created_at", { ascending: true })
        .limit(500);

      if (msgError) throw msgError;

      let orderLabel: string | null = null;
      let customerName: string | null = null;
      if (conv.order_id) {
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("order_id, customer_name")
          .eq("id", conv.order_id)
          .eq("workspace_id", authorized.id)
          .maybeSingle();
        if (order) {
          orderLabel = formatOrderId(order);
          customerName = order.customer_name;
        }
      }

      let ambiguousOrderCount = 0;
      if (!conv.order_id) {
        const { matchOrderForInboundPhone } =
          await import("@/lib/whatsapp/inbound/order-match.server");
        const match = await matchOrderForInboundPhone(authorized.id, conv.customer_phone_e164);
        ambiguousOrderCount = match.ambiguousOrderCount;
      }

      return {
        conversation: {
          id: conv.id,
          customerPhone: conv.customer_phone_e164,
          orderId: conv.order_id,
          orderLabel,
          customerName,
          lastMessagePreview: conv.last_message_preview,
          lastMessageAt: conv.last_message_at,
          unreadCount: 0,
          ambiguousOrderCount,
        },
        messages: (messages ?? []).map((m) => ({
          id: m.id,
          direction: m.direction as "inbound" | "outbound",
          body: m.message_body,
          status: m.status,
          createdAt: m.created_at,
        })),
      };
    } catch (error) {
      if (isWorkspaceAccessError(error)) throw error;
      console.error("[inbox] getWhatsAppConversation failed", error);
      return null;
    }
  });

export const sendWhatsAppInboxMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => sendInput.parse(data))
  .handler(async ({ data, context }) => {
    try {
      const authorized = await authorizeWorkspaceInput(context.userId, data.workspaceId);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: conv, error } = await supabaseAdmin
        .from("whatsapp_conversations")
        .select("id, customer_phone_e164, order_id")
        .eq("id", data.conversationId)
        .eq("workspace_id", authorized.id)
        .maybeSingle();

      if (error || !conv) {
        throw new Error("conversation_not_found");
      }

      return await runSendWhatsAppTextMessage({
        workspaceId: authorized.id,
        userId: context.userId,
        orderId: conv.order_id,
        conversationId: conv.id,
        clientMessageId: data.clientMessageId,
        recipientPhone: conv.customer_phone_e164,
        text: data.text,
      });
    } catch (error) {
      throw toWhatsAppUserError(error);
    }
  });

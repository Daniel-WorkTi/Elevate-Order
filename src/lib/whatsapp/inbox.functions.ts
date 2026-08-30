import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { formatOrderId, formatOrderTotal, type OperationalOrder } from "@/lib/order-domain";
import { authorizeWorkspaceInput } from "@/lib/workspace/authorize-workspace-input";
import { isWorkspaceAccessError } from "@/lib/workspace/require-workspace-access";
import { runSendWhatsAppTextMessage } from "@/lib/whatsapp/providers/whatsapp-web/send-message.server";
import { toWhatsAppUserError } from "@/lib/whatsapp/errors";
import { normalizePhoneToE164 } from "@/lib/whatsapp/phone-e164.server";

type OrderInboxFields = Pick<
  OperationalOrder,
  | "id"
  | "order_id"
  | "customer_name"
  | "product_summary"
  | "total"
  | "currency"
  | "status_name"
  | "confirmed_at"
>;

export type WhatsAppConversationListItem = {
  id: string;
  customerPhone: string;
  orderId: string | null;
  orderNumericId: number | null;
  orderLabel: string | null;
  orderTotalLabel: string | null;
  productSummary: string | null;
  statusName: string | null;
  confirmedAt: string | null;
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

export type WhatsAppConfirmationTimelineEvent = {
  id: string;
  source: "whatsapp_auto" | "operator";
  customerReply: string | null;
  createdAt: string;
};

export type WhatsAppTimelineItem =
  | ({ kind: "message" } & WhatsAppConversationMessage)
  | ({ kind: "confirmation" } & WhatsAppConfirmationTimelineEvent);

export type WhatsAppConversationDetail = {
  conversation: WhatsAppConversationListItem;
  messages: WhatsAppConversationMessage[];
  timeline: WhatsAppTimelineItem[];
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

const messageInput = conversationInput.extend({
  messageId: z.string().uuid(),
});

const deleteConversationsInput = workspaceInput.extend({
  conversationIds: z.array(z.string().uuid()).min(1).max(100),
});

type SupabaseAdmin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

async function detachMessagesFromOrders(
  supabaseAdmin: SupabaseAdmin,
  workspaceId: string,
  messageIds: string[],
) {
  if (messageIds.length === 0) return;

  const { error } = await supabaseAdmin
    .from("orders")
    .update({ confirmation_message_id: null })
    .eq("workspace_id", workspaceId)
    .in("confirmation_message_id", messageIds);

  if (error) throw error;
}

async function deleteConfirmationEventsForMessages(
  supabaseAdmin: SupabaseAdmin,
  workspaceId: string,
  messageIds: string[],
) {
  if (messageIds.length === 0) return;

  const { error } = await supabaseAdmin
    .from("order_confirmation_events")
    .delete()
    .eq("workspace_id", workspaceId)
    .in("message_id", messageIds);

  if (error) throw error;
}

async function refreshConversationPreviewAfterDelete(
  supabaseAdmin: SupabaseAdmin,
  workspaceId: string,
  conversationId: string,
) {
  const { data: latest, error: latestError } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("message_body, created_at")
    .eq("workspace_id", workspaceId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw latestError;

  const preview = latest?.message_body?.trim().slice(0, 120) ?? null;

  const { error: updateError } = await supabaseAdmin
    .from("whatsapp_conversations")
    .update({
      last_message_preview: preview,
      last_message_at: latest?.created_at ?? null,
      ...(latest ? {} : { unread_count: 0 }),
    })
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);

  if (updateError) throw updateError;
}

async function detachConversationsFromOrders(
  supabaseAdmin: SupabaseAdmin,
  workspaceId: string,
  conversationIds: string[],
) {
  if (conversationIds.length === 0) return;

  const { error } = await supabaseAdmin
    .from("orders")
    .update({ confirmation_conversation_id: null })
    .eq("workspace_id", workspaceId)
    .in("confirmation_conversation_id", conversationIds);

  if (error) throw error;
}

async function purgeWhatsAppConversations(
  supabaseAdmin: SupabaseAdmin,
  workspaceId: string,
  conversationIds: string[],
): Promise<number> {
  if (conversationIds.length === 0) return 0;

  const { data: convs, error: convError } = await supabaseAdmin
    .from("whatsapp_conversations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("id", conversationIds);

  if (convError) throw convError;

  const validIds = (convs ?? []).map((row) => row.id);
  if (validIds.length === 0) {
    throw new Error("conversation_not_found");
  }

  const { data: messages, error: messagesError } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("conversation_id", validIds);

  if (messagesError) throw messagesError;

  const messageIds = (messages ?? []).map((row) => row.id);

  if (messageIds.length > 0) {
    await deleteConfirmationEventsForMessages(supabaseAdmin, workspaceId, messageIds);
    await detachMessagesFromOrders(supabaseAdmin, workspaceId, messageIds);
  }

  const { error: deleteEventsError } = await supabaseAdmin
    .from("order_confirmation_events")
    .delete()
    .eq("workspace_id", workspaceId)
    .in("conversation_id", validIds);

  if (deleteEventsError) throw deleteEventsError;

  await detachConversationsFromOrders(supabaseAdmin, workspaceId, validIds);

  if (messageIds.length > 0) {
    const { error: deleteMessagesError } = await supabaseAdmin
      .from("whatsapp_messages")
      .delete()
      .eq("workspace_id", workspaceId)
      .in("conversation_id", validIds);

    if (deleteMessagesError) throw deleteMessagesError;
  }

  const { error: deleteConversationsError } = await supabaseAdmin
    .from("whatsapp_conversations")
    .delete()
    .eq("workspace_id", workspaceId)
    .in("id", validIds);

  if (deleteConversationsError) throw deleteConversationsError;

  return validIds.length;
}

function mapOrderFields(
  order: OrderInboxFields,
): Pick<
  WhatsAppConversationListItem,
  | "orderId"
  | "orderNumericId"
  | "orderLabel"
  | "orderTotalLabel"
  | "productSummary"
  | "statusName"
  | "confirmedAt"
  | "customerName"
> {
  return {
    orderId: order.id,
    orderNumericId: order.order_id,
    orderLabel: formatOrderId(order),
    orderTotalLabel: formatOrderTotal(order),
    productSummary: order.product_summary?.trim() || null,
    statusName: order.status_name?.trim() || null,
    confirmedAt: order.confirmed_at ?? null,
    customerName: order.customer_name?.trim() || null,
  };
}

async function loadOrdersById(
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  workspaceId: string,
  orderUuids: string[],
): Promise<Map<string, OrderInboxFields>> {
  const map = new Map<string, OrderInboxFields>();
  if (orderUuids.length === 0) return map;

  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select(
      "id, order_id, customer_name, product_summary, total, currency, status_name, confirmed_at",
    )
    .eq("workspace_id", workspaceId)
    .in("id", orderUuids);

  for (const order of orders ?? []) {
    map.set(order.id, order);
  }
  return map;
}

/** One fetch per workspace — map E.164 phone → matching orders. */
async function loadPhoneOrderIndex(
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  workspaceId: string,
): Promise<Map<string, OrderInboxFields[]>> {
  const index = new Map<string, OrderInboxFields[]>();

  const { data: rows } = await supabaseAdmin
    .from("orders")
    .select(
      "id, order_id, customer_name, product_summary, total, currency, status_name, confirmed_at, phone",
    )
    .eq("workspace_id", workspaceId)
    .not("phone", "is", null)
    .order("last_event_at", { ascending: false, nullsFirst: false })
    .limit(500);

  for (const row of rows ?? []) {
    const phone = normalizePhoneToE164(row.phone);
    if (!phone) continue;
    const { phone: _phone, ...order } = row;
    const list = index.get(phone) ?? [];
    list.push(order);
    index.set(phone, list);
  }

  return index;
}

function resolveOrderForConversation(
  row: { order_id: string | null; customer_phone_e164: string },
  ordersById: Map<string, OrderInboxFields>,
  phoneIndex: Map<string, OrderInboxFields[]>,
): { order: OrderInboxFields | null; ambiguousOrderCount: number } {
  if (row.order_id) {
    return { order: ordersById.get(row.order_id) ?? null, ambiguousOrderCount: 0 };
  }

  const matches = phoneIndex.get(row.customer_phone_e164) ?? [];
  if (matches.length === 1) {
    return { order: matches[0]!, ambiguousOrderCount: 0 };
  }
  if (matches.length > 1) {
    return { order: null, ambiguousOrderCount: matches.length };
  }
  return { order: null, ambiguousOrderCount: 0 };
}

function isOrderLinkedConversation(
  row: { customer_phone_e164: string },
  order: OrderInboxFields | null,
  ambiguousOrderCount: number,
  phoneIndex: Map<string, OrderInboxFields[]>,
): boolean {
  if (order) return true;
  if (ambiguousOrderCount > 0) return true;
  return (phoneIndex.get(row.customer_phone_e164)?.length ?? 0) > 0;
}

async function loadConnectedPhoneE164(
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  workspaceId: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("whatsapp_connections")
    .select("display_phone_number")
    .eq("workspace_id", workspaceId)
    .eq("provider", "whatsapp_web")
    .in("status", ["connected", "reconnecting"])
    .maybeSingle();

  if (!data?.display_phone_number) return null;
  return normalizePhoneToE164(data.display_phone_number);
}

function buildListItem(
  row: {
    id: string;
    customer_phone_e164: string;
    order_id: string | null;
    last_message_preview: string | null;
    last_message_at: string | null;
    unread_count: number | null;
  },
  order: OrderInboxFields | null,
  ambiguousOrderCount: number,
): WhatsAppConversationListItem {
  const orderFields = order ? mapOrderFields(order) : null;

  return {
    id: row.id,
    customerPhone: row.customer_phone_e164,
    orderId: orderFields?.orderId ?? row.order_id,
    orderNumericId: orderFields?.orderNumericId ?? null,
    orderLabel: orderFields?.orderLabel ?? null,
    orderTotalLabel: orderFields?.orderTotalLabel ?? null,
    productSummary: orderFields?.productSummary ?? null,
    statusName: orderFields?.statusName ?? null,
    confirmedAt: orderFields?.confirmedAt ?? null,
    customerName: orderFields?.customerName ?? null,
    lastMessagePreview: row.last_message_preview,
    lastMessageAt: row.last_message_at,
    unreadCount: row.unread_count ?? 0,
    ambiguousOrderCount,
  };
}

export const queryWhatsAppConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => workspaceInput.parse(data))
  .handler(
    async ({ data, context }): Promise<{ conversations: WhatsAppConversationListItem[] }> => {
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

      const orderUuids = [
        ...new Set((rows ?? []).map((r) => r.order_id).filter(Boolean)),
      ] as string[];

      const [ordersById, phoneIndex, connectedPhone] = await Promise.all([
        loadOrdersById(supabaseAdmin, authorized.id, orderUuids),
        loadPhoneOrderIndex(supabaseAdmin, authorized.id),
        loadConnectedPhoneE164(supabaseAdmin, authorized.id),
      ]);

      const conversations = (rows ?? [])
        .filter((row) => row.customer_phone_e164 !== connectedPhone)
        .flatMap((row) => {
          const { order, ambiguousOrderCount } = resolveOrderForConversation(
            row,
            ordersById,
            phoneIndex,
          );
          if (!isOrderLinkedConversation(row, order, ambiguousOrderCount, phoneIndex)) {
            return [];
          }
          return [buildListItem(row, order, ambiguousOrderCount)];
        });

      return { conversations };
    },
  );

export const getWhatsAppConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => conversationInput.parse(data))
  .handler(async ({ data, context }): Promise<WhatsAppConversationDetail | null> => {
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

    const { error: readError } = await supabaseAdmin.rpc("mark_whatsapp_conversation_read", {
      p_workspace_id: authorized.id,
      p_conversation_id: data.conversationId,
    });
    if (readError) {
      console.error("[inbox] mark_whatsapp_conversation_read failed", readError.message);
    }

    const { data: messages, error: msgError } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id, direction, message_body, status, created_at")
      .eq("workspace_id", authorized.id)
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (msgError) throw msgError;

    const orderUuids = conv.order_id ? [conv.order_id] : [];
    const [ordersById, phoneIndex, connectedPhone] = await Promise.all([
      loadOrdersById(supabaseAdmin, authorized.id, orderUuids),
      conv.order_id
        ? Promise.resolve(new Map<string, OrderInboxFields[]>())
        : loadPhoneOrderIndex(supabaseAdmin, authorized.id),
      loadConnectedPhoneE164(supabaseAdmin, authorized.id),
    ]);

    if (conv.customer_phone_e164 === connectedPhone) return null;

    const { order, ambiguousOrderCount } = resolveOrderForConversation(
      conv,
      ordersById,
      phoneIndex,
    );

    if (!isOrderLinkedConversation(conv, order, ambiguousOrderCount, phoneIndex)) {
      return null;
    }

    const mappedMessages = (messages ?? []).map((m) => ({
      id: m.id,
      direction: m.direction as "inbound" | "outbound",
      body: m.message_body,
      status: m.status,
      createdAt: m.created_at,
    }));

    const messageBodies = new Map(
      mappedMessages.map((message) => [message.id, message.body?.trim() || null]),
    );

    const { data: confirmationRows } = await supabaseAdmin
      .from("order_confirmation_events")
      .select("id, source, message_id, created_at")
      .eq("workspace_id", authorized.id)
      .eq("conversation_id", data.conversationId)
      .eq("event_type", "order_confirmed")
      .order("created_at", { ascending: true });

    const confirmationEvents: WhatsAppConfirmationTimelineEvent[] = (confirmationRows ?? [])
      .filter(
        (row): row is typeof row & { source: "whatsapp_auto" | "operator" } =>
          row.source === "whatsapp_auto" || row.source === "operator",
      )
      .map((row) => ({
        id: row.id,
        source: row.source,
        customerReply: row.message_id ? (messageBodies.get(row.message_id) ?? null) : null,
        createdAt: row.created_at,
      }));

    const timeline: WhatsAppTimelineItem[] = [
      ...mappedMessages.map((message) => ({ kind: "message" as const, ...message })),
      ...confirmationEvents.map((event) => ({ kind: "confirmation" as const, ...event })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return {
      conversation: {
        ...buildListItem(conv, order, ambiguousOrderCount),
        unreadCount: 0,
      },
      messages: mappedMessages,
      timeline,
    };
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
      if (isWorkspaceAccessError(error)) throw error;
      throw toWhatsAppUserError(error);
    }
  });

export const deleteWhatsAppInboxMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => messageInput.parse(data))
  .handler(async ({ data, context }) => {
    const authorized = await authorizeWorkspaceInput(context.userId, data.workspaceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: msg, error: msgError } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id")
      .eq("id", data.messageId)
      .eq("workspace_id", authorized.id)
      .eq("conversation_id", data.conversationId)
      .maybeSingle();

    if (msgError || !msg) {
      throw new Error("message_not_found");
    }

    await deleteConfirmationEventsForMessages(supabaseAdmin, authorized.id, [msg.id]);
    await detachMessagesFromOrders(supabaseAdmin, authorized.id, [msg.id]);

    const { error: deleteError } = await supabaseAdmin
      .from("whatsapp_messages")
      .delete()
      .eq("id", msg.id)
      .eq("workspace_id", authorized.id);

    if (deleteError) throw deleteError;

    await refreshConversationPreviewAfterDelete(
      supabaseAdmin,
      authorized.id,
      data.conversationId,
    );

    return { ok: true as const };
  });

export const deleteWhatsAppInboxConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => deleteConversationsInput.parse(data))
  .handler(async ({ data, context }) => {
    const authorized = await authorizeWorkspaceInput(context.userId, data.workspaceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const deletedCount = await purgeWhatsAppConversations(
      supabaseAdmin,
      authorized.id,
      data.conversationIds,
    );

    return { ok: true as const, deletedCount };
  });

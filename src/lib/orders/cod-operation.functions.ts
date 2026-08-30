import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { authorizeWorkspaceInput } from "@/lib/workspace/authorize-workspace-input";

const handleInput = z.object({
  workspaceId: z.string().uuid(),
  orderUuid: z.string().uuid(),
});

export type MarkCodOperationHandledResult = {
  applied: boolean;
  alreadyHandled: boolean;
  eventId: string | null;
};

export const markCodOperationHandled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => handleInput.parse(data))
  .handler(async ({ data, context }): Promise<MarkCodOperationHandledResult> => {
    const authorized = await authorizeWorkspaceInput(context.userId, data.workspaceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin.rpc("mark_cod_operation_handled", {
      p_workspace_id: authorized.id,
      p_order_uuid: data.orderUuid,
      p_actor_user_id: context.userId,
    });

    if (error) throw error;

    const row = (rows as Array<{
      applied: boolean;
      already_handled: boolean;
      event_id: string | null;
    }> | null)?.[0];

    if (!row) {
      throw new Error("mark_cod_operation_handled_empty_result");
    }

    return {
      applied: row.applied,
      alreadyHandled: row.already_handled,
      eventId: row.event_id,
    };
  });

export type OrderCodOperationDetail = {
  codReplyIntent: string | null;
  codReplyText: string | null;
  codReplyAt: string | null;
  codRequestSentAt: string | null;
  codHandledAt: string | null;
  operationStatus: "pending_action" | "handled" | "externally_confirmed" | "not_applicable";
  dropiOrderId: number;
  dropiPanelUrl: string;
};

const detailInput = z.object({
  workspaceId: z.string().uuid(),
  orderUuid: z.string().uuid(),
});

export const getOrderCodOperationDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => detailInput.parse(data))
  .handler(async ({ data, context }): Promise<OrderCodOperationDetail | null> => {
    const authorized = await authorizeWorkspaceInput(context.userId, data.workspaceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deriveCodOperationStatus, isDropiOrder } = await import("@/lib/orders/cod-operation");
    const { dropiOrdersPanelUrl } = await import("@/lib/integrations/dropi/dropi-order-url");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "order_id, source, status_name, details, cod_reply_intent, cod_reply_text, cod_reply_at, cod_request_sent_at, cod_handled_at",
      )
      .eq("id", data.orderUuid)
      .eq("workspace_id", authorized.id)
      .maybeSingle();

    if (error || !order) return null;
    if (!isDropiOrder(order)) return null;

    return {
      codReplyIntent: order.cod_reply_intent,
      codReplyText: order.cod_reply_text,
      codReplyAt: order.cod_reply_at,
      codRequestSentAt: order.cod_request_sent_at,
      codHandledAt: order.cod_handled_at,
      operationStatus: deriveCodOperationStatus(order),
      dropiOrderId: order.order_id,
      dropiPanelUrl: dropiOrdersPanelUrl(),
    };
  });

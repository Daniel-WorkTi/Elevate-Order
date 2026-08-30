import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { confirmOrderCod } from "@/lib/orders/confirm-order.server";
import { authorizeWorkspaceInput } from "@/lib/workspace/authorize-workspace-input";
import {
  DEFAULT_CONFIRM_KEYWORDS,
  DEFAULT_REJECT_KEYWORDS,
  parseConfirmationKeywordInput,
} from "@/lib/whatsapp/inbound/classify-confirmation-intent";

const confirmInput = z.object({
  workspaceId: z.string().uuid(),
  orderUuid: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
});

export const confirmOrderCodManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => confirmInput.parse(data))
  .handler(async ({ data, context }) => {
    await authorizeWorkspaceInput(context.userId, data.workspaceId);
    return confirmOrderCod({
      workspaceId: data.workspaceId,
      orderUuid: data.orderUuid,
      source: "operator",
      actorUserId: context.userId,
      conversationId: data.conversationId ?? null,
      messageId: data.messageId ?? null,
    });
  });

const settingsInput = z.object({
  workspaceId: z.string().uuid(),
});

export const getWorkspaceWhatsAppSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => settingsInput.parse(data))
  .handler(async ({ data, context }) => {
    await authorizeWorkspaceInput(context.userId, data.workspaceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("workspaces")
      .select("whatsapp_auto_confirm, whatsapp_confirm_keywords, whatsapp_reject_keywords")
      .eq("id", data.workspaceId)
      .maybeSingle();

    if (error) throw error;

    return {
      whatsappAutoConfirm: row?.whatsapp_auto_confirm === true,
      confirmKeywords: row?.whatsapp_confirm_keywords ?? [],
      rejectKeywords: row?.whatsapp_reject_keywords ?? [],
      defaultConfirmKeywords: DEFAULT_CONFIRM_KEYWORDS,
      defaultRejectKeywords: DEFAULT_REJECT_KEYWORDS,
    };
  });

const updateAutoConfirmInput = settingsInput.extend({
  whatsappAutoConfirm: z.boolean(),
});

export const updateWorkspaceWhatsAppAutoConfirm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => updateAutoConfirmInput.parse(data))
  .handler(async ({ data, context }) => {
    await authorizeWorkspaceInput(context.userId, data.workspaceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({ whatsapp_auto_confirm: data.whatsappAutoConfirm })
      .eq("id", data.workspaceId);

    if (error) throw error;

    return { whatsappAutoConfirm: data.whatsappAutoConfirm };
  });

const updateKeywordsInput = settingsInput.extend({
  confirmKeywordsText: z.string().max(4000),
  rejectKeywordsText: z.string().max(4000),
});

export const updateWorkspaceWhatsAppConfirmationKeywords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => updateKeywordsInput.parse(data))
  .handler(async ({ data, context }) => {
    await authorizeWorkspaceInput(context.userId, data.workspaceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const confirmKeywords = parseConfirmationKeywordInput(data.confirmKeywordsText);
    const rejectKeywords = parseConfirmationKeywordInput(data.rejectKeywordsText);

    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({
        whatsapp_confirm_keywords: confirmKeywords,
        whatsapp_reject_keywords: rejectKeywords,
      })
      .eq("id", data.workspaceId);

    if (error) throw error;

    return { confirmKeywords, rejectKeywords };
  });

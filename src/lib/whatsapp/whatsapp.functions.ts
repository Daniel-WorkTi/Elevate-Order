import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActiveWhatsAppProvider } from "@/lib/whatsapp/providers/registry";
import type { WhatsAppConnectionPublicStatus } from "@/lib/whatsapp/providers/types";
import { toWhatsAppUserError } from "@/lib/whatsapp/errors";

const workspaceInput = z.object({
  workspaceId: z.string().uuid(),
});

const disconnectInput = workspaceInput.extend({
  connectionId: z.string().uuid(),
});

const sendMessageInput = workspaceInput.extend({
  orderId: z.string().uuid(),
  clientMessageId: z.string().uuid(),
  recipientPhone: z.string().min(1).max(32),
  text: z.string().min(1).max(4096),
});

async function requireUserId(): Promise<string> {
  const { createServerSupabase } = await import("@/integrations/supabase/ssr.server");
  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("unauthenticated");
  return data.user.id;
}

export type { WhatsAppConnectionPublicStatus };
export type {
  DisconnectWhatsAppWebResponse,
  StartWhatsAppWebConnectResponse,
} from "@/lib/whatsapp/providers/whatsapp-web/connect.server";

export const getWhatsAppConnectionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => workspaceInput.parse(data))
  .handler(async ({ data }): Promise<WhatsAppConnectionPublicStatus> => {
    const provider = getActiveWhatsAppProvider();
    const empty: WhatsAppConnectionPublicStatus = {
      configured: provider.isConfigured(),
      provider: null,
      connectionId: null,
      status: "disconnected",
      verifiedName: null,
      displayPhoneNumber: null,
      connectedAt: null,
    };

    try {
      const userId = await requireUserId();
      const { authorizeWorkspaceInput } = await import("@/lib/workspace/authorize-workspace-input");
      await authorizeWorkspaceInput(userId, data.workspaceId);
      return await provider.getConnectionStatus(data.workspaceId);
    } catch (error) {
      console.error("[whatsapp] connection status failed", error);
      return empty;
    }
  });

export const startWhatsAppConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => workspaceInput.parse(data))
  .handler(async ({ data }) => {
    try {
      const userId = await requireUserId();
      const { authorizeWorkspaceInput } = await import("@/lib/workspace/authorize-workspace-input");
      await authorizeWorkspaceInput(userId, data.workspaceId);
      const { runStartWhatsAppWebConnect } =
        await import("@/lib/whatsapp/providers/whatsapp-web/connect.server");
      return await runStartWhatsAppWebConnect({ workspaceId: data.workspaceId, userId });
    } catch (error) {
      throw toWhatsAppUserError(error);
    }
  });

export const disconnectWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => disconnectInput.parse(data))
  .handler(async ({ data }) => {
    try {
      const userId = await requireUserId();
      const { authorizeWorkspaceInput } = await import("@/lib/workspace/authorize-workspace-input");
      await authorizeWorkspaceInput(userId, data.workspaceId);
      const { runDisconnectWhatsAppWeb } =
        await import("@/lib/whatsapp/providers/whatsapp-web/connect.server");
      return await runDisconnectWhatsAppWeb({
        workspaceId: data.workspaceId,
        userId,
        connectionId: data.connectionId,
      });
    } catch (error) {
      throw toWhatsAppUserError(error);
    }
  });

export type { SendWhatsAppTextMessageResult } from "@/lib/whatsapp/providers/whatsapp-web/send-message.server";

export const sendWhatsAppMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => sendMessageInput.parse(data))
  .handler(async ({ data }) => {
    try {
      const userId = await requireUserId();
      const { authorizeWorkspaceInput } = await import("@/lib/workspace/authorize-workspace-input");
      await authorizeWorkspaceInput(userId, data.workspaceId);
      const provider = getActiveWhatsAppProvider();
      return await provider.sendTextMessage({
        workspaceId: data.workspaceId,
        userId,
        orderId: data.orderId,
        clientMessageId: data.clientMessageId,
        recipientPhone: data.recipientPhone,
        text: data.text,
      });
    } catch (error) {
      throw toWhatsAppUserError(error);
    }
  });

/** @deprecated Meta Embedded Signup removed from active UI — legacy meta_cloud only. */
export const getWhatsAppPublicConfigFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    throw new Error("Meta Embedded Signup is no longer available in the active UI.");
  });

/** @deprecated Meta Embedded Signup removed from active UI — legacy meta_cloud only. */
export const completeWhatsAppEmbeddedSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    throw new Error("Meta Embedded Signup is no longer available in the active UI.");
  });

/** @deprecated Use getWhatsAppPublicConfigFn */
export const getWhatsAppEmbeddedSignupConfig = getWhatsAppPublicConfigFn;

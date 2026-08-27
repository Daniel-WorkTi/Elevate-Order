import { z } from "zod";

import { authorizeWorkspaceInput } from "@/lib/workspace/authorize-workspace-input";
import {
  sanitizeMetaErrorForLog,
  toWhatsAppUserError,
  WhatsAppUserError,
} from "@/lib/integrations/whatsapp/errors";
import type { WhatsAppCompleteSignupResponse } from "@/lib/integrations/whatsapp/whatsapp.functions";

const completeSignupInput = z.object({
  workspaceId: z.string().uuid(),
  code: z.string().min(1).max(4096),
  wabaId: z.string().min(1).max(128).optional(),
  phoneNumberId: z.string().min(1).max(128).optional(),
  metaBusinessId: z.string().min(1).max(128).optional(),
});

async function requireUserId(): Promise<string> {
  const { createServerSupabase } = await import("@/integrations/supabase/ssr.server");
  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("unauthenticated");
  return data.user.id;
}

export async function runCompleteWhatsAppEmbeddedSignup(
  input: z.infer<typeof completeSignupInput>,
  options: {
    fetchImpl?: import("@/lib/integrations/whatsapp/graph").GraphFetch;
    userId?: string;
  } = {},
): Promise<WhatsAppCompleteSignupResponse> {
  let connectionId: string | null = null;
  const workspaceId = input.workspaceId;

  try {
    const { getWhatsAppServerConfig } = await import("@/lib/integrations/whatsapp/config");
    const {
      assertWorkspaceCanConnectWhatsApp,
      createPendingWhatsAppConnection,
      finalizeWhatsAppConnection,
    } = await import("@/lib/integrations/whatsapp/persist-connection.server");
    const { exchangeEmbeddedSignupCode, resolveAuthorizedWhatsAppResources } =
      await import("@/lib/integrations/whatsapp/graph");

    const config = getWhatsAppServerConfig();
    const userId = options.userId ?? (await requireUserId());
    await authorizeWorkspaceInput(userId, workspaceId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertWorkspaceCanConnectWhatsApp(supabaseAdmin, workspaceId);

    const pending = await createPendingWhatsAppConnection(supabaseAdmin, workspaceId);
    connectionId = pending.connectionId;

    const token = await exchangeEmbeddedSignupCode(config, input.code, options.fetchImpl);

    const authorization = await resolveAuthorizedWhatsAppResources(
      config,
      token.accessToken,
      token.expiresIn,
      {
        wabaId: input.wabaId ?? null,
        phoneNumberId: input.phoneNumberId ?? null,
      },
      options.fetchImpl,
    );

    await finalizeWhatsAppConnection(supabaseAdmin, {
      workspaceId,
      connectionId,
      authorization,
      metaBusinessId: input.metaBusinessId ?? null,
      tokenEncryptionKeyBase64: config.tokenEncryptionKeyBase64,
    });

    return {
      ok: true,
      status: "connected",
      verifiedName: authorization.verifiedName,
      displayPhoneNumber: authorization.displayPhoneNumber,
    };
  } catch (error) {
    if (connectionId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { markWhatsAppConnectionError } =
        await import("@/lib/integrations/whatsapp/persist-connection.server");
      await markWhatsAppConnectionError(
        supabaseAdmin,
        connectionId,
        workspaceId,
        sanitizeMetaErrorForLog(error),
      );
    }

    if (error instanceof WhatsAppUserError) {
      throw error;
    }

    throw toWhatsAppUserError(error);
  }
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  toWhatsAppUserError,
  whatsAppUserMessage,
} from "@/lib/integrations/whatsapp/errors";

const workspaceInput = z.object({
  workspaceId: z.string().uuid(),
});

const completeSignupInput = workspaceInput.extend({
  code: z.string().min(1).max(4096),
  wabaId: z.string().min(1).max(128).optional(),
  phoneNumberId: z.string().min(1).max(128).optional(),
  metaBusinessId: z.string().min(1).max(128).optional(),
});

export type WhatsAppPublicConfigResponse = {
  appId: string;
  configId: string;
};

export type WhatsAppConnectionPublicStatus = {
  configured: boolean;
  status: "disconnected" | "pending" | "connected" | "error";
  verifiedName: string | null;
  displayPhoneNumber: string | null;
  connectedAt: string | null;
};

export type WhatsAppCompleteSignupResponse = {
  ok: true;
  status: "connected";
  verifiedName: string | null;
  displayPhoneNumber: string | null;
};

async function requireUserId(): Promise<string> {
  const { createServerSupabase } = await import("@/integrations/supabase/ssr.server");
  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("unauthenticated");
  return data.user.id;
}

function throwUserError(error: unknown): never {
  const userError = toWhatsAppUserError(error);
  throw new Error(userError.message);
}

export const getWhatsAppPublicConfigFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<WhatsAppPublicConfigResponse> => {
    try {
      const { getWhatsAppPublicConfig } = await import("@/lib/integrations/whatsapp/config");
      return getWhatsAppPublicConfig();
    } catch {
      throw new Error(whatsAppUserMessage("not_configured"));
    }
  });

export const getWhatsAppConnectionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => workspaceInput.parse(data))
  .handler(async ({ data }): Promise<WhatsAppConnectionPublicStatus> => {
    const { tryGetWhatsAppPublicConfig } = await import("@/lib/integrations/whatsapp/config");
    const configured = tryGetWhatsAppPublicConfig() !== null;
    const empty: WhatsAppConnectionPublicStatus = {
      configured,
      status: "disconnected",
      verifiedName: null,
      displayPhoneNumber: null,
      connectedAt: null,
    };

    try {
      const userId = await requireUserId();
      const { authorizeWorkspaceInput } =
        await import("@/lib/workspace/authorize-workspace-input");
      await authorizeWorkspaceInput(userId, data.workspaceId);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("whatsapp_connections")
        .select("display_phone_number, verified_name, connected_at, status")
        .eq("workspace_id", data.workspaceId)
        .in("status", ["pending", "connected", "error"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !row) return empty;

      const status = row.status as WhatsAppConnectionPublicStatus["status"];
      if (status === "error" || status === "pending") {
        return { ...empty, status: status === "pending" ? "pending" : "disconnected" };
      }

      return {
        configured,
        status: "connected",
        verifiedName: row.verified_name,
        displayPhoneNumber: row.display_phone_number,
        connectedAt: row.connected_at,
      };
    } catch (error) {
      console.error("[whatsapp] connection status failed", error);
      return empty;
    }
  });

export const completeWhatsAppEmbeddedSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => completeSignupInput.parse(data))
  .handler(async ({ data }): Promise<WhatsAppCompleteSignupResponse> => {
    try {
      const { runCompleteWhatsAppEmbeddedSignup } =
        await import("@/lib/integrations/whatsapp/whatsapp-complete.server");
      return await runCompleteWhatsAppEmbeddedSignup(data);
    } catch (error) {
      throwUserError(error);
    }
  });

/** @deprecated Use getWhatsAppPublicConfigFn */
export const getWhatsAppEmbeddedSignupConfig = getWhatsAppPublicConfigFn;

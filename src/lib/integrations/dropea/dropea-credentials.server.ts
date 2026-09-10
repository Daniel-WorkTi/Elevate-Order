import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  TokenCryptoError,
} from "@/lib/integrations/credential-crypto.server";
import { authorizeWorkspaceInput } from "@/lib/workspace/authorize-workspace-input";

const saveInput = z.object({
  workspaceId: z.string().uuid(),
  apiToken: z.string().min(8).max(512),
  hmacSecret: z.string().min(8).max(512),
});

export type DropeaCredentialStatus = {
  linked: boolean;
  apiTokenConfigured: boolean;
  hmacSecretConfigured: boolean;
  linkedAt: string | null;
};

const emptyStatus = (): DropeaCredentialStatus => ({
  linked: false,
  apiTokenConfigured: false,
  hmacSecretConfigured: false,
  linkedAt: null,
});

export async function loadDropeaApiToken(workspaceId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("workspace_provider_credentials")
    .select("api_token_ciphertext")
    .eq("workspace_id", workspaceId)
    .eq("provider", "dropea")
    .maybeSingle();

  if (error || !data?.api_token_ciphertext) return null;
  try {
    return decryptIntegrationSecret(data.api_token_ciphertext);
  } catch {
    return null;
  }
}

export const getDropeaCredentialStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => {
    const raw = (data ?? {}) as Record<string, unknown>;
    return { workspaceId: typeof raw["workspaceId"] === "string" ? raw["workspaceId"] : "" };
  })
  .handler(async ({ data, context }): Promise<DropeaCredentialStatus> => {
    const workspaceId = (await authorizeWorkspaceInput(context.userId, data.workspaceId)).id;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("workspace_provider_credentials")
      .select("api_token_ciphertext, hmac_secret_ciphertext, linked_at")
      .eq("workspace_id", workspaceId)
      .eq("provider", "dropea")
      .maybeSingle();

    if (error || !row) return emptyStatus();

    return {
      linked: Boolean(row.api_token_ciphertext),
      apiTokenConfigured: Boolean(row.api_token_ciphertext),
      hmacSecretConfigured: Boolean(row.hmac_secret_ciphertext),
      linkedAt: row.linked_at ?? null,
    };
  });

export const saveDropeaCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => saveInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const workspaceId = (await authorizeWorkspaceInput(context.userId, data.workspaceId)).id;
      const apiCipher = encryptIntegrationSecret(data.apiToken.trim());
      const hmacCipher = encryptIntegrationSecret(data.hmacSecret.trim());
      const nowIso = new Date().toISOString();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("workspace_provider_credentials").upsert(
        {
          workspace_id: workspaceId,
          provider: "dropea",
          api_token_ciphertext: apiCipher,
          hmac_secret_ciphertext: hmacCipher,
          linked_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: "workspace_id,provider" },
      );
      if (error) {
        console.error("[dropea] credential save failed", error.message);
        return {
          ok: false,
          error:
            "Unable to save Dropea credentials. Apply the latest database migration and try again.",
        };
      }
      return { ok: true };
    } catch (error) {
      if (error instanceof TokenCryptoError) {
        return { ok: false, error: "Credential encryption is not available on this server." };
      }
      console.error("[dropea] credential save failed", error);
      return { ok: false, error: "Unable to save Dropea credentials." };
    }
  });

export const clearDropeaCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => {
    const raw = (data ?? {}) as Record<string, unknown>;
    return { workspaceId: z.string().uuid().parse(raw["workspaceId"]) };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const workspaceId = (await authorizeWorkspaceInput(context.userId, data.workspaceId)).id;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("workspace_provider_credentials")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("provider", "dropea");
    return { ok: true };
  });

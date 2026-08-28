import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { WhatsAppUserError } from "@/lib/whatsapp/errors";
import type { ResolvedWhatsAppAuthorization } from "@/lib/whatsapp/providers/meta-cloud/graph";
import { encryptWhatsAppToken } from "@/lib/whatsapp/providers/meta-cloud/token-crypto.server";

type AdminClient = SupabaseClient<Database>;

export class WhatsAppConnectionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppConnectionConflictError";
  }
}

function provisionalId(prefix: "pending", connectionId: string): string {
  return `${prefix}:${connectionId}`;
}

export async function assertWorkspaceCanConnectWhatsApp(
  supabaseAdmin: AdminClient,
  workspaceId: string,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("whatsapp_connections")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("status", "connected")
    .maybeSingle();

  if (error) {
    console.error("[whatsapp] connected lookup failed", { workspace_id: workspaceId, error });
    throw new Error("Unable to verify WhatsApp connection state.");
  }

  if (data?.id) {
    throw new WhatsAppUserError(
      "workspace_already_connected",
      "Este workspace já possui um WhatsApp conectado.",
    );
  }
}

export async function createPendingWhatsAppConnection(
  supabaseAdmin: AdminClient,
  workspaceId: string,
): Promise<{ connectionId: string }> {
  const nowIso = new Date().toISOString();
  const connectionId = crypto.randomUUID();

  const { error: cleanupError } = await supabaseAdmin
    .from("whatsapp_connections")
    .update({ status: "error", disconnected_at: nowIso })
    .eq("workspace_id", workspaceId)
    .in("status", ["initializing", "pending"]);

  if (cleanupError) {
    console.error("[whatsapp] pending cleanup failed", { workspace_id: workspaceId, cleanupError });
  }

  const { data, error } = await supabaseAdmin
    .from("whatsapp_connections")
    .insert({
      id: connectionId,
      workspace_id: workspaceId,
      provider: "meta_cloud",
      waba_id: provisionalId("pending", connectionId),
      phone_number_id: provisionalId("pending", connectionId),
      status: "initializing",
      connected_at: null,
      disconnected_at: null,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("[whatsapp] pending insert failed", { workspace_id: workspaceId, error });
    throw new Error("Unable to start WhatsApp connection.");
  }

  console.info("[whatsapp] pending connection created", {
    workspace_id: workspaceId,
    connection_id: data.id,
    operation: "create_pending",
    status: "initializing",
    provider: "meta_cloud",
    timestamp: nowIso,
  });

  return { connectionId: data.id };
}

export async function markWhatsAppConnectionError(
  supabaseAdmin: AdminClient,
  connectionId: string,
  workspaceId: string,
  metaError?: Record<string, unknown>,
): Promise<void> {
  const nowIso = new Date().toISOString();
  await supabaseAdmin
    .from("whatsapp_connections")
    .update({ status: "error", disconnected_at: nowIso })
    .eq("id", connectionId)
    .eq("workspace_id", workspaceId);

  console.warn("[whatsapp] connection marked error", {
    workspace_id: workspaceId,
    connection_id: connectionId,
    operation: "mark_error",
    status: "error",
    timestamp: nowIso,
    ...metaError,
  });
}

export async function finalizeWhatsAppConnection(
  supabaseAdmin: AdminClient,
  input: {
    workspaceId: string;
    connectionId: string;
    authorization: ResolvedWhatsAppAuthorization;
    metaBusinessId: string | null;
    tokenEncryptionKeyBase64: string;
  },
): Promise<void> {
  const nowIso = new Date().toISOString();

  const { data: phoneOwner, error: phoneOwnerError } = await supabaseAdmin
    .from("whatsapp_connections")
    .select("id, workspace_id")
    .eq("phone_number_id", input.authorization.phoneNumberId)
    .in("status", ["initializing", "pending", "connected"])
    .neq("id", input.connectionId)
    .maybeSingle();

  if (phoneOwnerError) {
    console.error("[whatsapp] phone ownership lookup failed", {
      workspace_id: input.workspaceId,
      connection_id: input.connectionId,
      phoneOwnerError,
    });
    throw new Error("Unable to verify WhatsApp phone availability.");
  }

  if (phoneOwner && phoneOwner.workspace_id !== input.workspaceId) {
    throw new WhatsAppUserError(
      "phone_already_connected",
      "Este número já está conectado a outro workspace.",
    );
  }

  let tokenCiphertext: string;
  try {
    tokenCiphertext = encryptWhatsAppToken(
      input.authorization.accessToken,
      input.tokenEncryptionKeyBase64,
    );
  } catch (error) {
    console.error("[whatsapp] token encryption failed", {
      workspace_id: input.workspaceId,
      connection_id: input.connectionId,
      operation: "encrypt_token",
    });
    throw error;
  }

  const { error: updateError } = await supabaseAdmin
    .from("whatsapp_connections")
    .update({
      meta_business_id: input.metaBusinessId,
      waba_id: input.authorization.wabaId,
      phone_number_id: input.authorization.phoneNumberId,
      display_phone_number: input.authorization.displayPhoneNumber,
      verified_name: input.authorization.verifiedName,
      status: "connected",
      connected_at: nowIso,
      disconnected_at: null,
    })
    .eq("id", input.connectionId)
    .eq("workspace_id", input.workspaceId);

  if (updateError) {
    console.error("[whatsapp] connection finalize update failed", {
      workspace_id: input.workspaceId,
      connection_id: input.connectionId,
      updateError,
    });
    if (updateError.code === "23505") {
      throw new WhatsAppUserError(
        "phone_already_connected",
        "Este número já está conectado a outro workspace.",
      );
    }
    throw new Error("Unable to save WhatsApp connection.");
  }

  const { error: secretError } = await supabaseAdmin.from("whatsapp_connection_secrets").upsert(
    {
      connection_id: input.connectionId,
      token_ciphertext: tokenCiphertext,
      token_expires_at: input.authorization.tokenExpiresAt,
    },
    { onConflict: "connection_id" },
  );

  if (secretError) {
    console.error("[whatsapp] secret persist failed", {
      workspace_id: input.workspaceId,
      connection_id: input.connectionId,
      secretError,
    });
    await markWhatsAppConnectionError(supabaseAdmin, input.connectionId, input.workspaceId);
    throw new Error("Unable to save WhatsApp credentials.");
  }

  console.info("[whatsapp] connection connected", {
    workspace_id: input.workspaceId,
    connection_id: input.connectionId,
    operation: "finalize",
    status: "connected",
    provider: "meta_cloud",
    timestamp: nowIso,
  });
}

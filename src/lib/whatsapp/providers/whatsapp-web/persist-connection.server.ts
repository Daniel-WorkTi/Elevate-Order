import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { WhatsAppUserError } from "@/lib/whatsapp/errors";

type AdminClient = SupabaseClient<Database>;

export async function assertWorkspaceCanStartWhatsAppWeb(
  supabaseAdmin: AdminClient,
  workspaceId: string,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("whatsapp_connections")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("provider", "whatsapp_web")
    .eq("status", "connected")
    .maybeSingle();

  if (error) throw new Error("Unable to verify WhatsApp connection state.");
  if (data?.id) {
    throw new WhatsAppUserError(
      "workspace_already_connected",
      "Este workspace já possui um WhatsApp conectado.",
    );
  }
}

export async function ensureWhatsAppWebConnectionRow(
  supabaseAdmin: AdminClient,
  workspaceId: string,
): Promise<{ connectionId: string }> {
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("whatsapp_connections")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("provider", "whatsapp_web")
    .in("status", [
      "disconnected",
      "error",
      "initializing",
      "qr_ready",
      "connecting",
      "reconnecting",
    ])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) throw new Error("Unable to prepare WhatsApp connection.");

  const nowIso = new Date().toISOString();

  if (existing?.id) {
    await supabaseAdmin
      .from("whatsapp_connections")
      .update({
        status: "initializing",
        disconnected_at: null,
        connected_at: null,
        display_phone_number: null,
        verified_name: null,
        waba_id: null,
        phone_number_id: null,
      })
      .eq("id", existing.id)
      .eq("workspace_id", workspaceId);
    return { connectionId: existing.id };
  }

  const connectionId = crypto.randomUUID();
  const { error: insertError } = await supabaseAdmin.from("whatsapp_connections").insert({
    id: connectionId,
    workspace_id: workspaceId,
    provider: "whatsapp_web",
    status: "initializing",
    waba_id: null,
    phone_number_id: null,
    connected_at: null,
    disconnected_at: null,
  });

  if (insertError) throw new Error("Unable to create WhatsApp connection.");
  console.info("[whatsapp-web] connection row created", {
    workspace_id: workspaceId,
    connection_id: connectionId,
    timestamp: nowIso,
  });
  return { connectionId };
}

export async function markWhatsAppWebConnectionError(
  supabaseAdmin: AdminClient,
  connectionId: string,
  workspaceId: string,
): Promise<void> {
  await supabaseAdmin
    .from("whatsapp_connections")
    .update({ status: "error", disconnected_at: new Date().toISOString() })
    .eq("id", connectionId)
    .eq("workspace_id", workspaceId)
    .eq("provider", "whatsapp_web");
}

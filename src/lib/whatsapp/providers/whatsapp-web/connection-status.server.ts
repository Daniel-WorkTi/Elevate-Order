import type { WhatsAppConnectionPublicStatus } from "@/lib/whatsapp/providers/types";
import { isWhatsAppProviderId, normalizeConnectionStatus } from "@/lib/whatsapp/domain-types";
import { isWhatsAppGatewayConfigured } from "@/lib/whatsapp/providers/context";

const ACTIVE_STATUSES = [
  "initializing",
  "qr_ready",
  "connecting",
  "connected",
  "reconnecting",
  "error",
] as const;

export async function getWhatsAppWebConnectionStatus(
  workspaceId: string,
): Promise<WhatsAppConnectionPublicStatus> {
  const configured = isWhatsAppGatewayConfigured();
  const empty: WhatsAppConnectionPublicStatus = {
    configured,
    provider: null,
    connectionId: null,
    status: "disconnected",
    verifiedName: null,
    displayPhoneNumber: null,
    connectedAt: null,
  };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: row, error } = await supabaseAdmin
    .from("whatsapp_connections")
    .select("id, provider, display_phone_number, verified_name, connected_at, status")
    .eq("workspace_id", workspaceId)
    .eq("provider", "whatsapp_web")
    .in("status", [...ACTIVE_STATUSES, "pending"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) return empty;

  const provider = isWhatsAppProviderId(String(row.provider ?? ""))
    ? (row.provider as WhatsAppConnectionPublicStatus["provider"])
    : null;
  const status = normalizeConnectionStatus(String(row.status ?? "disconnected"));

  if (status === "error") {
    return { ...empty, provider, connectionId: row.id, status: "disconnected" };
  }

  if (status === "connected") {
    return {
      configured,
      provider,
      connectionId: row.id,
      status: "connected",
      verifiedName: row.verified_name,
      displayPhoneNumber: row.display_phone_number,
      connectedAt: row.connected_at,
    };
  }

  return {
    configured,
    provider,
    connectionId: row.id,
    status,
    verifiedName: row.verified_name,
    displayPhoneNumber: row.display_phone_number,
    connectedAt: row.connected_at,
  };
}

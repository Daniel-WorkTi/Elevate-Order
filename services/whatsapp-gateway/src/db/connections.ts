import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { GatewayConfig } from "../config.js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(config: GatewayConfig): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export type ConnectionRow = {
  id: string;
  workspace_id: string;
  provider: string;
  status: string;
  display_phone_number: string | null;
  verified_name: string | null;
  connected_at: string | null;
};

export async function fetchConnection(
  config: GatewayConfig,
  connectionId: string,
): Promise<ConnectionRow | null> {
  const { data, error } = await getSupabaseAdmin(config)
    .from("whatsapp_connections")
    .select("id, workspace_id, provider, status, display_phone_number, verified_name, connected_at")
    .eq("id", connectionId)
    .maybeSingle();
  if (error) throw new Error(`connection_lookup_failed:${error.message}`);
  return data as ConnectionRow | null;
}

export async function updateConnectionStatus(
  config: GatewayConfig,
  connectionId: string,
  workspaceId: string,
  patch: {
    status: string;
    display_phone_number?: string | null;
    verified_name?: string | null;
    connected_at?: string | null;
    disconnected_at?: string | null;
  },
): Promise<void> {
  const { error } = await getSupabaseAdmin(config)
    .from("whatsapp_connections")
    .update(patch)
    .eq("id", connectionId)
    .eq("workspace_id", workspaceId)
    .eq("provider", "whatsapp_web");
  if (error) throw new Error(`connection_update_failed:${error.message}`);
}

export async function listRestorableConnections(config: GatewayConfig): Promise<ConnectionRow[]> {
  const { data, error } = await getSupabaseAdmin(config)
    .from("whatsapp_connections")
    .select("id, workspace_id, provider, status, display_phone_number, verified_name, connected_at")
    .eq("provider", "whatsapp_web")
    .in("status", ["connected", "reconnecting"]);
  if (error) throw new Error(`list_connections_failed:${error.message}`);
  return (data ?? []) as ConnectionRow[];
}

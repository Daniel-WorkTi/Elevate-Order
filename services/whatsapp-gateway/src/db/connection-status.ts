import type { GatewayConfig } from "../config.js";
import { getSupabaseAdmin } from "./supabase.js";

export type ConnectionStatusPatch = {
  status?: string;
  display_phone_number?: string | null;
  verified_name?: string | null;
  connected_at?: string | null;
  disconnected_at?: string | null;
  last_seen_at?: string | null;
  last_error_code?: number | null;
};

type CachedRow = {
  status: string;
  display_phone_number: string | null;
  verified_name: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
};

/** Update only when values change — avoids connected→connected spam. */
export async function patchConnectionIfChanged(
  config: GatewayConfig,
  connectionId: string,
  workspaceId: string,
  patch: ConnectionStatusPatch,
  cache: CachedRow | null,
): Promise<CachedRow | null> {
  const next: ConnectionStatusPatch = { ...patch };

  if (cache) {
    const unchanged =
      (next.status === undefined || next.status === cache.status) &&
      (next.display_phone_number === undefined ||
        next.display_phone_number === cache.display_phone_number) &&
      (next.verified_name === undefined || next.verified_name === cache.verified_name) &&
      (next.connected_at === undefined || next.connected_at === cache.connected_at) &&
      (next.disconnected_at === undefined || next.disconnected_at === cache.disconnected_at);

    if (unchanged && next.last_seen_at === undefined && next.last_error_code === undefined) {
      return cache;
    }

    if (next.status === cache.status) delete next.status;
    if (next.display_phone_number === cache.display_phone_number) delete next.display_phone_number;
    if (next.verified_name === cache.verified_name) delete next.verified_name;
    if (next.connected_at === cache.connected_at) delete next.connected_at;
    if (next.disconnected_at === cache.disconnected_at) delete next.disconnected_at;
  }

  if (Object.keys(next).length === 0) return cache;

  const { error } = await getSupabaseAdmin(config)
    .from("whatsapp_connections")
    .update(next)
    .eq("id", connectionId)
    .eq("workspace_id", workspaceId)
    .eq("provider", "whatsapp_web");
  if (error) throw new Error(`connection_update_failed:${error.message}`);

  const { data, error: readError } = await getSupabaseAdmin(config)
    .from("whatsapp_connections")
    .select("status, display_phone_number, verified_name, connected_at, disconnected_at")
    .eq("id", connectionId)
    .maybeSingle();
  if (readError || !data) return cache;

  return data as CachedRow;
}

export async function loadConnectionCache(
  config: GatewayConfig,
  connectionId: string,
): Promise<CachedRow | null> {
  const { data, error } = await getSupabaseAdmin(config)
    .from("whatsapp_connections")
    .select("status, display_phone_number, verified_name, connected_at, disconnected_at")
    .eq("id", connectionId)
    .maybeSingle();
  if (error || !data) return null;
  return data as CachedRow;
}

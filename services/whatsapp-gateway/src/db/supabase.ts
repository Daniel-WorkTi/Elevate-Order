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

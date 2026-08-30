import type { AuthenticationCreds, SignalDataTypeMap } from "@whiskeysockets/baileys";
import { BufferJSON, initAuthCreds } from "@whiskeysockets/baileys";

import type { GatewayConfig } from "../config.js";
import { decryptSessionPayload, encryptSessionPayload } from "../crypto/session-crypto.js";
import { getSupabaseAdmin } from "../db/supabase.js";

export type SessionRecord = {
  id: string;
  workspace_id: string;
  connection_id: string;
};

export async function loadSessionRecord(
  config: GatewayConfig,
  connectionId: string,
): Promise<SessionRecord | null> {
  const { data, error } = await getSupabaseAdmin(config)
    .from("whatsapp_sessions")
    .select("id, workspace_id, connection_id")
    .eq("connection_id", connectionId)
    .maybeSingle();
  if (error) throw new Error(`session_lookup_failed:${error.message}`);
  return data as SessionRecord | null;
}

export async function loadEncryptedCreds(
  config: GatewayConfig,
  connectionId: string,
): Promise<AuthenticationCreds | null> {
  const { data, error } = await getSupabaseAdmin(config)
    .from("whatsapp_sessions")
    .select("encrypted_creds")
    .eq("connection_id", connectionId)
    .maybeSingle();
  if (error) throw new Error(`creds_lookup_failed:${error.message}`);
  if (!data?.encrypted_creds) return null;
  const json = decryptSessionPayload(data.encrypted_creds, config.sessionEncryptionKeyBase64);
  return JSON.parse(json, BufferJSON.reviver) as AuthenticationCreds;
}

export async function saveEncryptedCreds(
  config: GatewayConfig,
  input: {
    sessionId: string | null;
    workspaceId: string;
    connectionId: string;
    creds: AuthenticationCreds;
  },
): Promise<string> {
  const encrypted_creds = encryptSessionPayload(
    JSON.stringify(input.creds, BufferJSON.replacer),
    config.sessionEncryptionKeyBase64,
  );

  if (input.sessionId) {
    const { error } = await getSupabaseAdmin(config)
      .from("whatsapp_sessions")
      .update({ encrypted_creds, last_seen_at: new Date().toISOString() })
      .eq("id", input.sessionId)
      .eq("connection_id", input.connectionId)
      .eq("workspace_id", input.workspaceId);
    if (error) throw new Error(`creds_update_failed:${error.message}`);
    return input.sessionId;
  }

  const { data, error } = await getSupabaseAdmin(config)
    .from("whatsapp_sessions")
    .insert({
      workspace_id: input.workspaceId,
      connection_id: input.connectionId,
      provider: "whatsapp_web",
      encrypted_creds,
      last_seen_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data?.id) throw new Error(`creds_insert_failed:${error?.message ?? "unknown"}`);
  return data.id as string;
}

type KeyRow = { key_type: string; key_id: string; encrypted_value: string };

export async function loadSessionKeysForIds(
  config: GatewayConfig,
  sessionId: string,
  keyType: string,
  keyIds: string[],
): Promise<KeyRow[]> {
  if (keyIds.length === 0) return [];
  const { data, error } = await getSupabaseAdmin(config)
    .from("whatsapp_session_keys")
    .select("key_type, key_id, encrypted_value")
    .eq("session_id", sessionId)
    .eq("key_type", keyType)
    .in("key_id", keyIds);
  if (error) throw new Error(`keys_lookup_failed:${error.message}`);
  return (data ?? []) as KeyRow[];
}

export async function upsertSessionKey(
  config: GatewayConfig,
  sessionId: string,
  keyType: string,
  keyId: string,
  value: unknown,
): Promise<void> {
  const encrypted_value = encryptSessionPayload(
    JSON.stringify(value, BufferJSON.replacer),
    config.sessionEncryptionKeyBase64,
  );
  const { error } = await getSupabaseAdmin(config)
    .from("whatsapp_session_keys")
    .upsert(
      { session_id: sessionId, key_type: keyType, key_id: keyId, encrypted_value },
      { onConflict: "session_id,key_type,key_id" },
    );
  if (error) throw new Error(`key_upsert_failed:${error.message}`);
}

export async function deleteSessionKey(
  config: GatewayConfig,
  sessionId: string,
  keyType: string,
  keyId: string,
): Promise<void> {
  const { error } = await getSupabaseAdmin(config)
    .from("whatsapp_session_keys")
    .delete()
    .eq("session_id", sessionId)
    .eq("key_type", keyType)
    .eq("key_id", keyId);
  if (error) throw new Error(`key_delete_failed:${error.message}`);
}

export async function deleteSessionData(
  config: GatewayConfig,
  connectionId: string,
  workspaceId: string,
): Promise<void> {
  const { error } = await getSupabaseAdmin(config)
    .from("whatsapp_sessions")
    .delete()
    .eq("connection_id", connectionId)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(`session_delete_failed:${error.message}`);
}

export type SupabaseAuthState = {
  creds: AuthenticationCreds;
  keys: {
    get<T extends keyof SignalDataTypeMap>(
      type: T,
      ids: string[],
    ): Promise<{ [id: string]: SignalDataTypeMap[T] }>;
    set(data: Record<string, Record<string, unknown>>): Promise<void>;
  };
  sessionId: string | null;
  saveCreds: () => Promise<void>;
  flushPendingWrites: () => Promise<void>;
};

function cacheKey(type: string, id: string): string {
  return `${type}:${id}`;
}

export async function createSupabaseAuthState(
  config: GatewayConfig,
  workspaceId: string,
  connectionId: string,
): Promise<SupabaseAuthState> {
  const { data, error } = await getSupabaseAdmin(config)
    .from("whatsapp_sessions")
    .select("id, encrypted_creds")
    .eq("connection_id", connectionId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(`session_lookup_failed:${error.message}`);

  let sessionId = (data?.id as string | undefined) ?? null;
  let creds: AuthenticationCreds;
  if (data?.encrypted_creds) {
    const json = decryptSessionPayload(data.encrypted_creds, config.sessionEncryptionKeyBase64);
    creds = JSON.parse(json, BufferJSON.reviver) as AuthenticationCreds;
  } else {
    creds = initAuthCreds();
  }
  const keyCache = new Map<string, unknown>();
  let pendingKeyWrites: Promise<void> = Promise.resolve();

  const keys = {
    async get<T extends keyof SignalDataTypeMap>(type: T, ids: string[]) {
      const out: { [id: string]: SignalDataTypeMap[T] } = {};
      if (ids.length === 0) return out;

      const missing: string[] = [];
      for (const id of ids) {
        const hit = keyCache.get(cacheKey(type, id));
        if (hit !== undefined) {
          out[id] = hit as SignalDataTypeMap[T];
        } else {
          missing.push(id);
        }
      }

      if (missing.length === 0 || !sessionId) return out;

      const rows = await loadSessionKeysForIds(config, sessionId, type, missing);
      for (const id of missing) {
        const row = rows.find((r) => r.key_id === id);
        if (!row) continue;
        const json = decryptSessionPayload(row.encrypted_value, config.sessionEncryptionKeyBase64);
        const parsed = JSON.parse(json, BufferJSON.reviver);
        keyCache.set(cacheKey(type, id), parsed);
        out[id] = parsed;
      }
      return out;
    },
    async set(data: Record<string, Record<string, unknown>>) {
      if (!sessionId) {
        sessionId = await saveEncryptedCreds(config, {
          sessionId: null,
          workspaceId,
          connectionId,
          creds,
        });
      }

      const ops: Promise<void>[] = [];
      for (const [type, entries] of Object.entries(data)) {
        for (const [id, value] of Object.entries(entries)) {
          const ck = cacheKey(type, id);
          if (value == null) {
            keyCache.delete(ck);
            ops.push(deleteSessionKey(config, sessionId, type, id));
          } else {
            keyCache.set(ck, value);
            ops.push(upsertSessionKey(config, sessionId, type, id, value));
          }
        }
      }

      pendingKeyWrites = pendingKeyWrites.then(() => Promise.all(ops)).then(() => undefined);
      await pendingKeyWrites;
    },
  };

  const saveCreds = async () => {
    await pendingKeyWrites;
    sessionId = await saveEncryptedCreds(config, {
      sessionId,
      workspaceId,
      connectionId,
      creds,
    });
  };

  const flushPendingWrites = async () => {
    await pendingKeyWrites;
    await saveCreds();
  };

  return { creds, keys, sessionId, saveCreds, flushPendingWrites };
}

/** Parse display phone from Baileys PN user id (e.g. 351912345678:12@s.whatsapp.net). */
export function phoneFromBaileysUserId(userId: string | undefined): string | null {
  if (!userId?.endsWith("@s.whatsapp.net")) return null;
  const local = userId.split("@")[0]?.split(":")[0] ?? "";
  if (!/^\d{6,15}$/.test(local)) return null;
  return `+${local}`;
}

export function verifiedNameFromCreds(creds: AuthenticationCreds): string | null {
  const name = creds.me?.name ?? creds.me?.verifiedName;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

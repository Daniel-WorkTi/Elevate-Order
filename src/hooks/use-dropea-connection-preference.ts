import { useCallback, useEffect, useSyncExternalStore } from "react";

export const DROPEA_CONNECTION_KEY = "elevate-dropea-connection";

export type DropeaConnectionPreference = {
  linked: boolean;
  linkedAt: string | null;
  /** API token (X-API-KEY) saved locally for this workspace. */
  apiTokenConfigured: boolean;
  /** HMAC secret for verifying Dropea webhook signatures. */
  hmacSecretConfigured: boolean;
};

const DEFAULT: DropeaConnectionPreference = {
  linked: false,
  linkedAt: null,
  apiTokenConfigured: false,
  hmacSecretConfigured: false,
};

const API_TOKEN_STORAGE = "elevate-dropea-api-token";
const HMAC_SECRET_STORAGE = "elevate-dropea-hmac-secret";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function readPreference(): DropeaConnectionPreference {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(DROPEA_CONNECTION_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<DropeaConnectionPreference> & {
      apiKeyConfigured?: boolean;
    };
    // Migrate older single-key preference shape.
    const apiTokenConfigured = Boolean(
      parsed.apiTokenConfigured ?? parsed.apiKeyConfigured,
    );
    return {
      linked: Boolean(parsed.linked),
      linkedAt: typeof parsed.linkedAt === "string" ? parsed.linkedAt : null,
      apiTokenConfigured,
      hmacSecretConfigured: Boolean(parsed.hmacSecretConfigured),
    };
  } catch {
    return DEFAULT;
  }
}

let cached = DEFAULT;
let hydrated = false;

function getSnapshot(): DropeaConnectionPreference {
  if (!hydrated && typeof window !== "undefined") {
    cached = readPreference();
    hydrated = true;
  }
  return cached;
}

function getServerSnapshot(): DropeaConnectionPreference {
  return DEFAULT;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function writePreference(next: DropeaConnectionPreference) {
  cached = next;
  try {
    window.localStorage.setItem(DROPEA_CONNECTION_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  emit();
}

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null) {
  try {
    if (!value) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export type DropeaConnectCredentials = {
  apiToken: string;
  hmacSecret: string;
};

/**
 * Per-operator Dropea credentials: API token + HMAC webhook secret.
 * Both are required to mark the workspace as connected.
 */
export function useDropeaConnectionPreference() {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (
        event.key !== DROPEA_CONNECTION_KEY &&
        event.key !== API_TOKEN_STORAGE &&
        event.key !== HMAC_SECRET_STORAGE &&
        event.key !== "elevate-dropea-api-key"
      ) {
        return;
      }
      cached = readPreference();
      emit();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const connect = useCallback((credentials: DropeaConnectCredentials) => {
    const apiToken = credentials.apiToken.trim();
    const hmacSecret = credentials.hmacSecret.trim();
    if (!apiToken || !hmacSecret) return false;

    writeLocal(API_TOKEN_STORAGE, apiToken);
    writeLocal(HMAC_SECRET_STORAGE, hmacSecret);
    // Clean legacy key if present
    writeLocal("elevate-dropea-api-key", null);

    writePreference({
      linked: true,
      linkedAt: new Date().toISOString(),
      apiTokenConfigured: true,
      hmacSecretConfigured: true,
    });
    return true;
  }, []);

  const disconnect = useCallback(() => {
    writeLocal(API_TOKEN_STORAGE, null);
    writeLocal(HMAC_SECRET_STORAGE, null);
    writeLocal("elevate-dropea-api-key", null);
    writePreference({
      linked: false,
      linkedAt: null,
      apiTokenConfigured: false,
      hmacSecretConfigured: false,
    });
  }, []);

  return {
    ...preference,
    /** @deprecated Prefer apiTokenConfigured */
    apiKeyConfigured:
      preference.apiTokenConfigured && preference.hmacSecretConfigured,
    getApiToken: () => readLocal(API_TOKEN_STORAGE),
    getHmacSecret: () => readLocal(HMAC_SECRET_STORAGE),
    connect,
    disconnect,
  };
}

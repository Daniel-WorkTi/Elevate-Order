import { useCallback, useEffect, useSyncExternalStore } from "react";

export const STORE_CONNECTION_KEY = "elevate-store-connection";
const ACCESS_TOKEN_STORAGE = "elevate-shopify-access-token";

export type StoreConnectionPreference = {
  linked: boolean;
  linkedAt: string | null;
  storeName: string | null;
  /** e.g. my-shop.myshopify.com */
  storeDomain: string | null;
  accessTokenConfigured: boolean;
};

const DEFAULT: StoreConnectionPreference = {
  linked: false,
  linkedAt: null,
  storeName: null,
  storeDomain: null,
  accessTokenConfigured: false,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
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

function readPreference(): StoreConnectionPreference {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORE_CONNECTION_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<StoreConnectionPreference>;
    const token = readLocal(ACCESS_TOKEN_STORAGE);
    return {
      linked: Boolean(parsed.linked),
      linkedAt: typeof parsed.linkedAt === "string" ? parsed.linkedAt : null,
      storeName: typeof parsed.storeName === "string" ? parsed.storeName : null,
      storeDomain: typeof parsed.storeDomain === "string" ? parsed.storeDomain : null,
      accessTokenConfigured: Boolean(parsed.accessTokenConfigured ?? token),
    };
  } catch {
    return DEFAULT;
  }
}

let cached = DEFAULT;
let hydrated = false;

function getSnapshot(): StoreConnectionPreference {
  if (!hydrated && typeof window !== "undefined") {
    cached = readPreference();
    hydrated = true;
  }
  return cached;
}

function getServerSnapshot(): StoreConnectionPreference {
  return DEFAULT;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function writePreference(next: StoreConnectionPreference) {
  cached = next;
  try {
    window.localStorage.setItem(STORE_CONNECTION_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  emit();
}

export type StoreConnectInput = {
  storeName: string;
  storeDomain: string;
  accessToken: string;
};

/** Normalize user input into a *.myshopify.com host when possible. */
export function normalizeShopifyDomain(value: string): string | null {
  const trimmed = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!trimmed) return null;
  const host = trimmed.split("/")[0] ?? "";
  if (!host) return null;
  if (host.endsWith(".myshopify.com")) return host;
  if (/^[a-z0-9][a-z0-9-]*$/.test(host)) return `${host}.myshopify.com`;
  return host;
}

/**
 * Per-workspace Shopify store link + Admin API token for order sync.
 */
export function useStoreConnectionPreference() {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORE_CONNECTION_KEY && event.key !== ACCESS_TOKEN_STORAGE) return;
      cached = readPreference();
      emit();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const connect = useCallback((input: StoreConnectInput) => {
    const storeName = input.storeName.trim();
    const storeDomain = normalizeShopifyDomain(input.storeDomain);
    const accessToken = input.accessToken.trim();
    if (!storeName || !storeDomain || !accessToken) return false;
    writeLocal(ACCESS_TOKEN_STORAGE, accessToken);
    writePreference({
      linked: true,
      linkedAt: new Date().toISOString(),
      storeName,
      storeDomain,
      accessTokenConfigured: true,
    });
    return true;
  }, []);

  const disconnect = useCallback(() => {
    writeLocal(ACCESS_TOKEN_STORAGE, null);
    writePreference({
      linked: false,
      linkedAt: null,
      storeName: null,
      storeDomain: null,
      accessTokenConfigured: false,
    });
  }, []);

  return {
    ...preference,
    getAccessToken: () => readLocal(ACCESS_TOKEN_STORAGE),
    connect,
    disconnect,
  };
}

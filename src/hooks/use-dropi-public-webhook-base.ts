import { useCallback, useEffect, useSyncExternalStore } from "react";

const PUBLIC_BASE_KEY = "elevate-dropi-public-webhook-base";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function readBase(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(PUBLIC_BASE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

let cached = "";
let hydrated = false;

function getSnapshot() {
  if (!hydrated && typeof window !== "undefined") {
    cached = readBase();
    hydrated = true;
  }
  return cached;
}

function getServerSnapshot() {
  return "";
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isLocalWebhookHost(origin: string) {
  try {
    const host = new URL(origin).hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local")
    );
  } catch {
    return /localhost|127\.0\.0\.1/i.test(origin);
  }
}

export function normalizePublicWebhookBase(value: string): string | null {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/** Public HTTPS origin used when building the Dropi webhook URL (overrides localhost). */
export function useDropiPublicWebhookBase() {
  const publicBase = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PUBLIC_BASE_KEY) return;
      cached = readBase();
      emit();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPublicBase = useCallback((value: string) => {
    const normalized = normalizePublicWebhookBase(value);
    cached = normalized ?? "";
    try {
      if (normalized) window.localStorage.setItem(PUBLIC_BASE_KEY, normalized);
      else window.localStorage.removeItem(PUBLIC_BASE_KEY);
    } catch {
      // ignore
    }
    emit();
  }, []);

  return { publicBase, setPublicBase };
}

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { parseWorkspaceId } from "@/lib/workspace/parse-workspace-id";

const WORKSPACE_KEY = "elevate-workspace-id";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function createId() {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function readId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(WORKSPACE_KEY)?.trim();
    if (existing && parseWorkspaceId(existing)) return existing;
    const next = createId();
    window.localStorage.setItem(WORKSPACE_KEY, next);
    return next;
  } catch {
    return createId();
  }
}

let cached = "";
let hydrated = false;

function getSnapshot() {
  if (!hydrated && typeof window !== "undefined") {
    cached = readId();
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

/** Stable browser workspace id until real auth/multi-tenant login exists. */
export function useWorkspaceId() {
  const workspaceId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== WORKSPACE_KEY) return;
      cached = readId();
      emit();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const resetWorkspaceId = useCallback(() => {
    const next = createId();
    cached = next;
    try {
      window.localStorage.setItem(WORKSPACE_KEY, next);
    } catch {
      // ignore
    }
    emit();
    return next;
  }, []);

  return { workspaceId, resetWorkspaceId };
}

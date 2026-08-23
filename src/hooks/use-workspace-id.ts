import { useCallback, useEffect, useSyncExternalStore } from "react";

const WORKSPACE_KEY = "elevate-workspace-id";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ws_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function readId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(WORKSPACE_KEY)?.trim();
    if (existing) return existing;
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

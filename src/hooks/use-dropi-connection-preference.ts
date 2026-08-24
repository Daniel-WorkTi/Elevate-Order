import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export const DROPI_CONNECTION_KEY = "elevate-dropi-connection";

export type DropiConnectionPreference = {
  /** Operator explicitly linked Dropi for this workspace/browser. */
  linked: boolean;
  linkedAt: string | null;
};

const DEFAULT: DropiConnectionPreference = {
  linked: false,
  linkedAt: null,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function readPreference(): DropiConnectionPreference {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(DROPI_CONNECTION_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<DropiConnectionPreference>;
    return {
      linked: Boolean(parsed.linked),
      linkedAt: typeof parsed.linkedAt === "string" ? parsed.linkedAt : null,
    };
  } catch {
    return DEFAULT;
  }
}

let cached = DEFAULT;
let hydrated = false;

function getSnapshot(): DropiConnectionPreference {
  if (!hydrated && typeof window !== "undefined") {
    cached = readPreference();
    hydrated = true;
  }
  return cached;
}

function getServerSnapshot(): DropiConnectionPreference {
  return DEFAULT;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function writePreference(next: DropiConnectionPreference) {
  cached = next;
  try {
    window.localStorage.setItem(DROPI_CONNECTION_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  emit();
}

/**
 * Per-operator Dropi link state. After Connect, UI shows Connected (like Shopify).
 */
export function useDropiConnectionPreference() {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== DROPI_CONNECTION_KEY) return;
      cached = readPreference();
      emit();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const connect = useCallback(() => {
    writePreference({
      linked: true,
      linkedAt: new Date().toISOString(),
    });
  }, []);

  const disconnect = useCallback(() => {
    writePreference({ linked: false, linkedAt: null });
  }, []);

  return {
    ...preference,
    connect,
    disconnect,
  };
}

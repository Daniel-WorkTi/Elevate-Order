import { useCallback, useEffect, useSyncExternalStore } from "react";

export const DROPI_CONNECTION_KEY = "elevate-dropi-connection";

/**
 * Operator confirmation that they pasted+saved the Dropi webhook URL.
 * This is configured_by_user — NOT Connected / verified.
 * Real Connected comes only from the first valid inbound Dropi webhook.
 */
export type DropiConnectionPreference = {
  /** @deprecated Prefer configuredByUser — same storage field. */
  linked: boolean;
  /** User confirmed webhook was saved in Dropi (onboarding progression). */
  configuredByUser: boolean;
  linkedAt: string | null;
};

const DEFAULT: DropiConnectionPreference = {
  linked: false,
  configuredByUser: false,
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
    const parsed = JSON.parse(raw) as Partial<DropiConnectionPreference> & { linked?: boolean };
    const configuredByUser = Boolean(parsed.configuredByUser ?? parsed.linked);
    return {
      linked: configuredByUser,
      configuredByUser,
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
    window.localStorage.setItem(
      DROPI_CONNECTION_KEY,
      JSON.stringify({
        linked: next.configuredByUser,
        configuredByUser: next.configuredByUser,
        linkedAt: next.linkedAt,
      }),
    );
  } catch {
    // ignore
  }
  emit();
}

/**
 * Dropi onboarding confirmation (configured_by_user).
 * Never maps to Connections "Connected" — that requires backend events.
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

  const markConfiguredByUser = useCallback((confirmed: boolean) => {
    if (!confirmed) {
      writePreference({ linked: false, configuredByUser: false, linkedAt: null });
      return;
    }
    writePreference({
      linked: true,
      configuredByUser: true,
      linkedAt: new Date().toISOString(),
    });
  }, []);

  /** @deprecated Use markConfiguredByUser(true) */
  const connect = useCallback(() => {
    markConfiguredByUser(true);
  }, [markConfiguredByUser]);

  const disconnect = useCallback(() => {
    markConfiguredByUser(false);
  }, [markConfiguredByUser]);

  return {
    ...preference,
    markConfiguredByUser,
    connect,
    disconnect,
  };
}

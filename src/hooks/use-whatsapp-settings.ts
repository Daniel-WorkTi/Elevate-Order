import { useCallback, useEffect, useSyncExternalStore } from "react";

export const WHATSAPP_SETTINGS_KEY = "elevate-whatsapp-settings";

/** Browser-only UI preferences — connection authority lives in Supabase. */
export type WhatsAppUiPreferences = {
  defaultIncidentTemplate: string;
  autoMessage: boolean;
};

const DEFAULT: WhatsAppUiPreferences = {
  defaultIncidentTemplate: "",
  autoMessage: false,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function readPreferences(): WhatsAppUiPreferences {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(WHATSAPP_SETTINGS_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<WhatsAppUiPreferences & Record<string, unknown>>;
    return {
      defaultIncidentTemplate:
        typeof parsed.defaultIncidentTemplate === "string" ? parsed.defaultIncidentTemplate : "",
      autoMessage: Boolean(parsed.autoMessage),
    };
  } catch {
    return DEFAULT;
  }
}

let cached = DEFAULT;
let hydrated = false;

function getSnapshot(): WhatsAppUiPreferences {
  if (!hydrated && typeof window !== "undefined") {
    cached = readPreferences();
    hydrated = true;
  }
  return cached;
}

function getServerSnapshot(): WhatsAppUiPreferences {
  return DEFAULT;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function writePreferences(next: WhatsAppUiPreferences) {
  cached = next;
  try {
    window.localStorage.setItem(WHATSAPP_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
  emit();
}

/** WhatsApp UI preferences stored in this browser only. */
export function useWhatsAppSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== WHATSAPP_SETTINGS_KEY) return;
      cached = readPreferences();
      emit();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback((next: WhatsAppUiPreferences) => {
    writePreferences({
      defaultIncidentTemplate: next.defaultIncidentTemplate.trim(),
      autoMessage: Boolean(next.autoMessage),
    });
  }, []);

  return { settings, save };
}

/** @deprecated Use WhatsAppUiPreferences — kept for gradual migration. */
export type WhatsAppSettings = WhatsAppUiPreferences;

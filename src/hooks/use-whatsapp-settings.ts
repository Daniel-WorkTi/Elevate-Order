import { useCallback, useEffect, useSyncExternalStore } from "react";

export const WHATSAPP_SETTINGS_KEY = "elevate-whatsapp-settings";

export type WhatsAppSettings = {
  phoneNumberId: string;
  businessAccountId: string;
  permanentToken: string;
  defaultIncidentTemplate: string;
  autoMessage: boolean;
};

const DEFAULT: WhatsAppSettings = {
  phoneNumberId: "",
  businessAccountId: "",
  permanentToken: "",
  defaultIncidentTemplate: "",
  autoMessage: false,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function readSettings(): WhatsAppSettings {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(WHATSAPP_SETTINGS_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<WhatsAppSettings>;
    return {
      phoneNumberId: typeof parsed.phoneNumberId === "string" ? parsed.phoneNumberId : "",
      businessAccountId:
        typeof parsed.businessAccountId === "string" ? parsed.businessAccountId : "",
      permanentToken: typeof parsed.permanentToken === "string" ? parsed.permanentToken : "",
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

function getSnapshot(): WhatsAppSettings {
  if (!hydrated && typeof window !== "undefined") {
    cached = readSettings();
    hydrated = true;
  }
  return cached;
}

function getServerSnapshot(): WhatsAppSettings {
  return DEFAULT;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function writeSettings(next: WhatsAppSettings) {
  cached = next;
  try {
    window.localStorage.setItem(WHATSAPP_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
  emit();
}

/** WhatsApp Business fields stored in this browser. Sending via the API is not wired yet. */
export function useWhatsAppSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== WHATSAPP_SETTINGS_KEY) return;
      cached = readSettings();
      emit();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback((next: WhatsAppSettings) => {
    writeSettings({
      phoneNumberId: next.phoneNumberId.trim(),
      businessAccountId: next.businessAccountId.trim(),
      permanentToken: next.permanentToken.trim(),
      defaultIncidentTemplate: next.defaultIncidentTemplate.trim(),
      autoMessage: Boolean(next.autoMessage),
    });
  }, []);

  return { settings, save };
}

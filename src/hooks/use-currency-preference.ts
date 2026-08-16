import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import {
  CURRENCY_PREFERENCE_KEY,
  type CurrencyPreference,
} from "@/lib/currency/currency-types";
import { normalizeCurrency } from "@/lib/money/format-money";

const DEFAULT_PREFERENCE: CurrencyPreference = { from: "EUR", to: "BRL" };

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function readPreference(): CurrencyPreference {
  if (typeof window === "undefined") return DEFAULT_PREFERENCE;
  try {
    const raw = window.localStorage.getItem(CURRENCY_PREFERENCE_KEY);
    if (!raw) return DEFAULT_PREFERENCE;
    const parsed = JSON.parse(raw) as Partial<CurrencyPreference>;
    return {
      from: normalizeCurrency(parsed.from, DEFAULT_PREFERENCE.from),
      to: normalizeCurrency(parsed.to, DEFAULT_PREFERENCE.to),
    };
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

let cachedPreference = DEFAULT_PREFERENCE;
let hydrated = false;

function getSnapshot(): CurrencyPreference {
  if (!hydrated && typeof window !== "undefined") {
    cachedPreference = readPreference();
    hydrated = true;
  }
  return cachedPreference;
}

function getServerSnapshot(): CurrencyPreference {
  return DEFAULT_PREFERENCE;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function writePreference(next: CurrencyPreference) {
  cachedPreference = {
    from: normalizeCurrency(next.from, DEFAULT_PREFERENCE.from),
    to: normalizeCurrency(next.to, DEFAULT_PREFERENCE.to),
  };
  try {
    window.localStorage.setItem(CURRENCY_PREFERENCE_KEY, JSON.stringify(cachedPreference));
  } catch {
    // ignore quota / private mode
  }
  emit();
}

/**
 * Shared currency preference for AppShell converter and future Inbox/Orders/Profits display.
 * Presentation only — never mutates canonical order amounts.
 */
export function useCurrencyPreference() {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setPreference = useCallback((next: CurrencyPreference) => {
    writePreference(next);
  }, []);

  const setFrom = useCallback((from: string) => {
    writePreference({ ...getSnapshot(), from });
  }, []);

  const setTo = useCallback((to: string) => {
    writePreference({ ...getSnapshot(), to });
  }, []);

  const swap = useCallback(() => {
    const current = getSnapshot();
    writePreference({ from: current.to, to: current.from });
  }, []);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CURRENCY_PREFERENCE_KEY) return;
      cachedPreference = readPreference();
      emit();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return {
    preference,
    from: preference.from,
    to: preference.to,
    /** Preferred display currency for operational screens (presentation only). */
    displayCurrency: preference.to,
    setPreference,
    setFrom,
    setTo,
    swap,
  };
}

export function getCurrencyPreferenceSnapshot(): CurrencyPreference {
  return getSnapshot();
}

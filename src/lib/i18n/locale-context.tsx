import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  readStoredLocale,
  translate,
  writeStoredLocale,
} from "@/lib/i18n/index";
import { messageLanguageFromLocale } from "@/lib/i18n/message-language";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/types";

const TEMPLATE_LANGUAGE_KEY = "elevate-template-language";

function syncTemplateLanguage(locale: Locale) {
  try {
    window.localStorage.setItem(TEMPLATE_LANGUAGE_KEY, messageLanguageFromLocale(locale));
  } catch {
    // ignore
  }
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (
    key: string,
    params?: Record<string, string | number | null | undefined>,
  ) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = readStoredLocale();
    setLocaleState(stored);
    syncTemplateLanguage(stored);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale === "pt" ? "pt" : "en";
    }
    syncTemplateLanguage(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeStoredLocale(next);
    syncTemplateLanguage(next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number | null | undefined>) =>
      translate(locale, key, params),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LocaleProvider");
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}

export function useMessageLanguage() {
  const { locale } = useI18n();
  return messageLanguageFromLocale(locale);
}

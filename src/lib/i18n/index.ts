import { en } from "@/lib/i18n/locales/en";
import { pt } from "@/lib/i18n/locales/pt";
import {
  DEFAULT_LOCALE,
  interpolate,
  LOCALE_STORAGE_KEY,
  type Locale,
  type TranslationDict,
} from "@/lib/i18n/types";

const dictionaries: Record<Locale, TranslationDict> = { pt, en };

export function isLocale(value: unknown): value is Locale {
  return value === "pt" || value === "en";
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function writeStoredLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}

export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number | null | undefined>,
): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  const fallback = dictionaries.en;
  const template = dict[key] ?? fallback[key] ?? key;
  return interpolate(template, params);
}

export { dictionaries };

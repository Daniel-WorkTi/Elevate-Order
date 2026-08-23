import { countryToFlagCode } from "@/lib/inbox/country-code";
import type { Locale } from "@/lib/i18n/types";

export type LanguageCode = "pt" | "en" | "es" | "pl" | "fr" | "it" | "de";

export type LanguageMeta = {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  iso: string;
};

/** Single catalog for UI locales, message badges, and selects. */
export const SUPPORTED_LANGUAGES: Record<LanguageCode, LanguageMeta> = {
  pt: { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹", iso: "PT" },
  en: { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", iso: "GB" },
  es: { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", iso: "ES" },
  pl: { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱", iso: "PL" },
  fr: { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", iso: "FR" },
  it: { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", iso: "IT" },
  de: { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", iso: "DE" },
};

export const LANGUAGE_LIST: LanguageMeta[] = [
  SUPPORTED_LANGUAGES.pt,
  SUPPORTED_LANGUAGES.en,
  SUPPORTED_LANGUAGES.es,
  SUPPORTED_LANGUAGES.pl,
  SUPPORTED_LANGUAGES.fr,
  SUPPORTED_LANGUAGES.it,
  SUPPORTED_LANGUAGES.de,
];

const COUNTRY_TO_LANGUAGE: Record<string, LanguageCode> = {
  pt: "pt",
  br: "pt",
  es: "es",
  mx: "es",
  ar: "es",
  cl: "es",
  co: "es",
  pe: "es",
  pl: "pl",
  fr: "fr",
  be: "fr",
  it: "it",
  de: "de",
  gb: "en",
  us: "en",
  nl: "en",
};

export function languageFromCountry(
  country: string | null | undefined,
): LanguageMeta | null {
  const iso = countryToFlagCode(country);
  if (!iso) return null;
  const code = COUNTRY_TO_LANGUAGE[iso];
  return code ? SUPPORTED_LANGUAGES[code] : null;
}

export function localeToLanguage(locale: Locale): LanguageMeta {
  return SUPPORTED_LANGUAGES[locale];
}

export function formatLanguageBadge(meta: LanguageMeta | null): {
  compact: string;
  label: string;
} {
  if (!meta) return { compact: "🌐 Unknown", label: "Unknown" };
  return { compact: `${meta.flag} ${meta.iso}`, label: meta.name };
}

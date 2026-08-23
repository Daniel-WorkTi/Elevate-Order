export type Locale = "pt" | "en";

export const LOCALES: readonly Locale[] = ["pt", "en"] as const;

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: "Português",
  en: "English",
};

export const DEFAULT_LOCALE: Locale = "pt";
export const LOCALE_STORAGE_KEY = "elevate-locale";

export type TranslationDict = Record<string, string>;

export function interpolate(
  template: string,
  params?: Record<string, string | number | null | undefined>,
) {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = params[key];
    return value == null ? "" : String(value);
  });
}

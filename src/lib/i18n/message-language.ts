import type { LanguageCode } from "@/lib/i18n/languages";
import type { Locale } from "@/lib/i18n/types";

/** Message/template language follows UI locale — PT or EN only. */
export function messageLanguageFromLocale(locale: Locale): LanguageCode {
  return locale === "en" ? "en" : "pt";
}

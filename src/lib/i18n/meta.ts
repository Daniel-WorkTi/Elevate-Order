import { translate } from "@/lib/i18n/index";
import { DEFAULT_LOCALE } from "@/lib/i18n/types";

/** Static document head copy — default locale (PT) until client hydrates locale preference. */
export function metaT(
  key: string,
  params?: Record<string, string | number | null | undefined>,
) {
  return translate(DEFAULT_LOCALE, key, params);
}

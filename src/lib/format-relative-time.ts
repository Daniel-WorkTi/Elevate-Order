import { differenceInHours, differenceInMinutes, isToday, isYesterday } from "date-fns";

import { formatDate, formatDateTime } from "@/lib/i18n/date-locale";
import type { Locale } from "@/lib/i18n/types";

export type RelativeTimestamp = {
  relative: string;
  exact: string;
};

type TranslateFn = (
  key: string,
  params?: Record<string, string | number | null | undefined>,
) => string;

/** Compact relative time for operational tables. Pass ISO timestamps only. */
export function formatRelativeTimestamp(
  iso: string | null | undefined,
  options?: {
    locale?: Locale;
    t?: TranslateFn;
  },
): RelativeTimestamp | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const locale = options?.locale ?? "pt";
  const t = options?.t;
  const exact = formatDateTime(date, locale);
  const now = new Date();
  const mins = differenceInMinutes(now, date);

  if (mins < 1) {
    return { relative: t ? t("common.justNow") : locale === "pt" ? "Agora" : "Just now", exact };
  }
  if (mins < 60) {
    return {
      relative: t
        ? t("common.minAgo", { n: mins })
        : locale === "pt"
          ? `há ${mins} min`
          : `${mins} min ago`,
      exact,
    };
  }

  const hours = differenceInHours(now, date);
  if (hours < 24 && isToday(date)) {
    return {
      relative: t
        ? t("common.hoursAgo", { n: hours })
        : locale === "pt"
          ? `há ${hours}h`
          : `${hours}h ago`,
      exact,
    };
  }
  if (isYesterday(date)) {
    return {
      relative: t ? t("common.yesterday") : locale === "pt" ? "Ontem" : "Yesterday",
      exact,
    };
  }

  return { relative: formatDate(date, locale), exact };
}

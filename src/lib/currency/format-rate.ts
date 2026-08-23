import { formatRelativeDistance, parseDisplayDate } from "@/lib/i18n/date-locale";
import type { Locale } from "@/lib/i18n/types";

/** i18n keys for rate status strings shown in the UI. */
export const CURRENCY_RATE_KEYS = {
  unavailable: "currency.rateUnavailable",
  updatedDash: "currency.updatedDash",
  usingCached: "currency.usingCached",
  updated: "currency.updated",
  rateLine: "currency.rateLine",
  rateLineEmpty: "currency.rateLineEmpty",
} as const;

type TranslateFn = (
  key: string,
  params?: Record<string, string | number | null | undefined>,
) => string;

export function formatRateUpdatedAt(
  updatedAt: Date | string | null | undefined,
  options: {
    cached?: boolean;
    unavailable?: boolean;
    t: TranslateFn;
    locale?: Locale;
  },
): string {
  const { t } = options;
  if (options.unavailable) return t(CURRENCY_RATE_KEYS.unavailable);
  if (!updatedAt) return t(CURRENCY_RATE_KEYS.updatedDash);
  const date = parseDisplayDate(updatedAt);
  if (!date) return t(CURRENCY_RATE_KEYS.updatedDash);
  const relative = formatRelativeDistance(date, options.locale ?? "pt");
  if (options.cached) return t(CURRENCY_RATE_KEYS.usingCached, { relative });
  return t(CURRENCY_RATE_KEYS.updated, { relative });
}

export function formatRateLine(
  from: string,
  to: string,
  rate: number | null | undefined,
  t: TranslateFn,
): string {
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    return t(CURRENCY_RATE_KEYS.rateLineEmpty, { from, to });
  }
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 2,
  }).format(rate);
  return t(CURRENCY_RATE_KEYS.rateLine, { from, to, rate: formatted });
}

export function formatCompactRate(rate: number | null | undefined): string {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(rate);
}

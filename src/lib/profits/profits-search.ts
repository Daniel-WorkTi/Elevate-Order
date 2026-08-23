import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
import { z } from "zod";

import { formatDayMonth, formatMonthYear } from "@/lib/i18n/date-locale";
import type { Locale } from "@/lib/i18n/types";
import type { Supply } from "@/lib/order-domain";

export const PROFIT_CURRENCIES = ["EUR", "BRL", "USD", "GBP"] as const;
export type ProfitCurrency = (typeof PROFIT_CURRENCIES)[number];

export const PROFIT_PERIODS = [
  "today",
  "7d",
  "30d",
  "this_month",
  "last_month",
  "all",
  "custom",
] as const;
export type ProfitPeriod = (typeof PROFIT_PERIODS)[number];

export const profitsSearchSchema = z.object({
  supply: z.enum(["all", "dropi", "dropea"]).catch("all"),
  period: z.enum(PROFIT_PERIODS).catch("all"),
  currency: z.enum(PROFIT_CURRENCIES).catch("EUR"),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type ProfitsSearch = z.infer<typeof profitsSearchSchema>;
export type ProfitsSupplyFilter = ProfitsSearch["supply"];

export const PERIOD_I18N_KEY: Record<ProfitPeriod, string> = {
  today: "profits.period.today",
  "7d": "profits.period.7d",
  "30d": "profits.period.30d",
  this_month: "profits.period.thisMonth",
  last_month: "profits.period.lastMonth",
  all: "profits.period.all",
  custom: "profits.period.custom",
};

/** @deprecated Prefer PERIOD_I18N_KEY + t() at the UI. */
export const PERIOD_LABEL: Record<ProfitPeriod, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  this_month: "This month",
  last_month: "Last month",
  all: "All time",
  custom: "Custom",
};

export function supplyFilterI18nKey(supply: ProfitsSupplyFilter): string {
  if (supply === "all") return "profits.supply.all";
  if (supply === "dropea") return "profits.supply.dropea";
  return "profits.supply.dropi";
}

/** @deprecated Prefer supplyFilterI18nKey + t() at the UI. */
export function supplyFilterLabel(supply: ProfitsSupplyFilter): string {
  if (supply === "all") return "All supplies";
  if (supply === "dropea") return "Dropea";
  return "Dropi";
}

export function profitsDateRange(search: Pick<ProfitsSearch, "period" | "from" | "to">): {
  from: string | null;
  to: string | null;
} {
  const now = new Date();

  switch (search.period) {
    case "today":
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case "7d":
      return { from: startOfDay(subDays(now, 6)).toISOString(), to: endOfDay(now).toISOString() };
    case "this_month":
      return { from: startOfMonth(now).toISOString(), to: endOfDay(now).toISOString() };
    case "last_month": {
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev).toISOString(), to: endOfMonth(prev).toISOString() };
    }
    case "all":
      return { from: null, to: null };
    case "custom": {
      const from = search.from
        ? startOfDay(new Date(search.from)).toISOString()
        : startOfDay(subDays(now, 29)).toISOString();
      const to = search.to ? endOfDay(new Date(search.to)).toISOString() : endOfDay(now).toISOString();
      return { from, to };
    }
    case "30d":
    default:
      return { from: startOfDay(subDays(now, 29)).toISOString(), to: endOfDay(now).toISOString() };
  }
}

export function matchesSupplyFilter(source: string, filter: ProfitsSupplyFilter): boolean {
  if (filter === "all") return true;
  const normalized = source.trim().toLowerCase();
  if (filter === "dropea") return normalized.includes("dropea");
  return normalized.includes("dropi") && !normalized.includes("dropea");
}

export function chartBucketKey(iso: string, period: ProfitPeriod): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  if (period === "today" || period === "7d" || period === "30d") {
    return format(date, "yyyy-MM-dd");
  }
  if (period === "all") {
    return format(date, "yyyy-MM");
  }
  return format(date, "yyyy-MM");
}

export function chartBucketLabel(
  key: string,
  period: ProfitPeriod,
  locale: Locale = "pt",
): string {
  if (key === "unknown") return "—";
  const date = new Date(key.length === 7 ? `${key}-01` : key);
  if (Number.isNaN(date.getTime())) return key;
  if (period === "today" || period === "7d" || period === "30d") {
    return formatDayMonth(date, locale);
  }
  return formatMonthYear(date, locale);
}

export type { Supply };

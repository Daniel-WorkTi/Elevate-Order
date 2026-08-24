import {
  format,
  formatDistanceToNowStrict,
  isValid,
  parseISO,
} from "date-fns";
import { enUS, pt } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";

import type { Locale } from "@/lib/i18n/types";

export function dateFnsLocale(locale: Locale): DateFnsLocale {
  return locale === "pt" ? pt : enUS;
}

export function parseDisplayDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const parsed = parseISO(value);
  if (isValid(parsed)) return parsed;
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
}

/** e.g. pt: "4 de julho de 2026 · 14:44" — never "4 jul 2026". */
export function formatDateTime(date: Date, locale: Locale): string {
  return format(date, "PPP · HH:mm", { locale: dateFnsLocale(locale) });
}

/** e.g. pt: "4 de julho de 2026" */
export function formatDate(date: Date, locale: Locale): string {
  return format(date, "PPP", { locale: dateFnsLocale(locale) });
}

/** e.g. pt: "4 de jul" / en: "Jul 4" */
export function formatDayMonth(date: Date, locale: Locale): string {
  const pattern = locale === "pt" ? "d 'de' MMM" : "MMM d";
  return format(date, pattern, { locale: dateFnsLocale(locale) }).replace(/\.$/, "");
}

/** e.g. pt: "jul. de 2026" / en: "Jul 2026" */
export function formatMonthYear(date: Date, locale: Locale): string {
  const pattern = locale === "pt" ? "MMM 'de' yyyy" : "MMM yyyy";
  return format(date, pattern, { locale: dateFnsLocale(locale) });
}

/** Strict relative: "há 2 meses", never "há aproximadamente 2 meses". */
export function formatRelativeDistance(date: Date, locale: Locale): string {
  return formatDistanceToNowStrict(date, {
    addSuffix: true,
    roundingMethod: "floor",
    locale: dateFnsLocale(locale),
  });
}

export function formatIsoDateTime(iso: string | null | undefined, locale: Locale = "pt"): string {
  const date = parseDisplayDate(iso);
  return date ? formatDateTime(date, locale) : "—";
}

/** Compact operator stamp: pt `23/08/2025 às 14:23`. */
export function formatOrderStamp(iso: string | null | undefined, locale: Locale = "pt"): string {
  const date = parseDisplayDate(iso);
  if (!date) return "—";
  const pattern = locale === "pt" ? "dd/MM/yyyy 'às' HH:mm" : "MM/dd/yyyy 'at' HH:mm";
  return format(date, pattern, { locale: dateFnsLocale(locale) });
}

export function formatIsoRelative(iso: string | null | undefined, locale: Locale = "pt"): string {
  const date = parseDisplayDate(iso);
  return date ? formatRelativeDistance(date, locale) : "—";
}

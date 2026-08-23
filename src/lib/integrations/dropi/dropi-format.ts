import { format } from "date-fns";

import {
  dateFnsLocale,
  formatIsoDateTime,
  formatIsoRelative,
  parseDisplayDate,
} from "@/lib/i18n/date-locale";
import type { Locale } from "@/lib/i18n/types";
import type { DropiConnectionStatus } from "@/lib/integrations/dropi/dropi-types";

export function formatDropiRelative(iso: string | null | undefined, locale: Locale = "pt"): string {
  return formatIsoRelative(iso, locale);
}

export function formatDropiDateTime(iso: string | null | undefined, locale: Locale = "pt"): string {
  return formatIsoDateTime(iso, locale);
}

export function formatDropiTime(iso: string | null | undefined, locale: Locale = "pt"): string {
  const date = parseDisplayDate(iso);
  if (!date) return "—";
  return format(date, "HH:mm", { locale: dateFnsLocale(locale) });
}

export function dropiStatusLabelKey(status: DropiConnectionStatus): string {
  switch (status) {
    case "connected":
      return "connections.connected";
    case "configured":
      return "connections.configured";
    case "error":
      return "connections.error";
    case "not_configured":
      return "connections.notConfigured";
  }
}

/** @deprecated Prefer dropiStatusLabelKey + useT() */
export function dropiStatusLabel(status: DropiConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Conectado";
    case "configured":
      return "Configurado";
    case "error":
      return "Erro";
    case "not_configured":
      return "Não configurado";
  }
}

export function dropiStatusClass(status: DropiConnectionStatus): string {
  switch (status) {
    case "connected":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "configured":
      return "border-blue-200 bg-blue-50 text-[#2563EB]";
    case "error":
      return "border-red-200 bg-red-50 text-red-700";
    case "not_configured":
      return "border-[#E6E8EC] bg-[#F7F8FA] text-[#667085]";
  }
}

/** Solid status dot — emerald when connected. */
export function dropiStatusDotClass(status: DropiConnectionStatus): string {
  switch (status) {
    case "connected":
      return "bg-emerald-500";
    case "configured":
      return "bg-[#2563EB]";
    case "error":
      return "bg-red-500";
    case "not_configured":
      return "bg-[#98A2B3]";
  }
}

export function formatMetricNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

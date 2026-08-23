import { formatIsoDateTime, formatIsoRelative } from "@/lib/i18n/date-locale";
import type { Locale } from "@/lib/i18n/types";
import type { DropeaConnectionStatus } from "@/lib/integrations/dropea/dropea-types";

export function formatDropeaRelative(iso: string | null | undefined, locale: Locale = "pt"): string {
  return formatIsoRelative(iso, locale);
}

export function formatDropeaDateTime(iso: string | null | undefined, locale: Locale = "pt"): string {
  return formatIsoDateTime(iso, locale);
}

export function dropeaStatusLabelKey(status: DropeaConnectionStatus): string {
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

/** @deprecated Prefer dropeaStatusLabelKey + useT() */
export function dropeaStatusLabel(status: DropeaConnectionStatus): string {
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

export function dropeaStatusClass(status: DropeaConnectionStatus): string {
  switch (status) {
    case "connected":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "configured":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "error":
      return "border-red-200 bg-red-50 text-red-700";
    case "not_configured":
      return "border-[#E6E8EC] bg-[#F7F8FA] text-[#667085]";
  }
}

export function formatDropeaMetric(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

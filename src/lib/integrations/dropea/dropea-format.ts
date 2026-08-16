import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

import type { DropeaConnectionStatus } from "@/lib/integrations/dropea/dropea-types";

export function formatDropeaRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = parseISO(iso);
  if (!isValid(date)) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatDropeaDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = parseISO(iso);
  if (!isValid(date)) return "—";
  return format(date, "d MMM yyyy · HH:mm");
}

export function dropeaStatusLabel(status: DropeaConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "configured":
      return "Configured";
    case "error":
      return "Error";
    case "not_configured":
      return "Not configured";
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

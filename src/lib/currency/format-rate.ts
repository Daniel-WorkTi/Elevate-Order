import { formatDistanceToNow } from "date-fns";

export function formatRateUpdatedAt(
  updatedAt: Date | string | null | undefined,
  options?: { cached?: boolean; unavailable?: boolean },
): string {
  if (options?.unavailable) return "Rate unavailable";
  if (!updatedAt) return "Updated —";
  const date = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  if (Number.isNaN(date.getTime())) return "Updated —";
  const relative = formatDistanceToNow(date, { addSuffix: true });
  if (options?.cached) return `Using cached rate · Updated ${relative}`;
  return `Updated ${relative}`;
}

export function formatRateLine(from: string, to: string, rate: number | null | undefined): string {
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    return `1 ${from} = — ${to}`;
  }
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 2,
  }).format(rate);
  return `1 ${from} = ${formatted} ${to}`;
}

export function formatCompactRate(rate: number | null | undefined): string {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(rate);
}

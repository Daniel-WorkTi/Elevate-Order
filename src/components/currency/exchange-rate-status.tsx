import { formatRateLine, formatRateUpdatedAt } from "@/lib/currency/format-rate";
import { cn } from "@/lib/utils";

export type ExchangeRateStatusProps = {
  from: string;
  to: string;
  rate: number | null;
  updatedAt: Date | string | null;
  loading?: boolean | undefined;
  cached?: boolean | undefined;
  unavailable?: boolean | undefined;
  className?: string | undefined;
};

export function ExchangeRateStatus({
  from,
  to,
  rate,
  updatedAt,
  loading,
  cached,
  unavailable,
  className,
}: ExchangeRateStatusProps) {
  if (loading) {
    return (
      <div className={cn("space-y-2", className)} aria-busy="true" aria-live="polite">
        <div className="h-4 w-44 animate-pulse rounded bg-[#E6E8EC]/80" />
        <div className="h-3 w-32 animate-pulse rounded bg-[#E6E8EC]/60" />
      </div>
    );
  }

  const statusText = formatRateUpdatedAt(updatedAt, {
    cached: Boolean(cached) && !unavailable,
    unavailable: Boolean(unavailable),
  });

  return (
    <div className={cn("space-y-1", className)} aria-live="polite">
      <p className="text-[14px] font-semibold tabular-nums tracking-tight text-[#0A0C10]">
        {unavailable ? `1 ${from} = — ${to}` : formatRateLine(from, to, rate)}
      </p>
      <p className="flex items-center gap-2 text-[12px] text-[#667085]">
        <span>{statusText}</span>
        {!unavailable ? (
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              cached ? "bg-amber-500" : "bg-emerald-500",
            )}
            aria-hidden
          />
        ) : null}
      </p>
    </div>
  );
}

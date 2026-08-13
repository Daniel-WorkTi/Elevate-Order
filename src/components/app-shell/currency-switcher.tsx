import { ArrowRight, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";

export type CurrencySwitcherProps = {
  from?: string;
  to?: string;
  rate?: number | null;
  updatedAt?: Date | string | null;
  className?: string;
  onClick?: () => void;
};

function formatUpdated(updatedAt: Date | string | null | undefined) {
  if (!updatedAt) return "Updated —";
  const date = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  if (Number.isNaN(date.getTime())) return "Updated —";
  return `Updated ${formatDistanceToNow(date, { addSuffix: true })}`;
}

export function CurrencySwitcher({
  from = "EUR",
  to = "BRL",
  rate = null,
  updatedAt = null,
  className,
  onClick,
}: CurrencySwitcherProps) {
  const rateLabel =
    typeof rate === "number" && Number.isFinite(rate) ? rate.toFixed(2) : "—";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-[220px] items-center justify-between gap-2 rounded-[12px] border border-border bg-card px-3 py-2 text-left transition-colors duration-150",
        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40",
        className,
      )}
      aria-label={`Currency ${from} to ${to}, rate ${rateLabel}`}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight text-foreground">
          <span>{from}</span>
          <ArrowRight className="size-3 text-muted-foreground" strokeWidth={1.5} />
          <span>{to}</span>
          <span className="ml-1 tabular-nums text-foreground">{rateLabel}</span>
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {formatUpdated(updatedAt)}
        </span>
      </span>
      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
    </button>
  );
}

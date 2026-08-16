import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type ConnectionStatCard = {
  key: string;
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone: string;
  valueClass?: string;
};

export function ConnectionStatCards({ cards }: { cards: ConnectionStatCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="flex items-center justify-between gap-3 rounded-[14px] border border-[#E6E8EC] bg-white px-4 py-3.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
                  card.tone,
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#667085]">{card.label}</p>
                {card.hint ? (
                  <p className="mt-0.5 truncate text-[11px] text-[#667085]">{card.hint}</p>
                ) : null}
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 text-right text-[18px] font-semibold tabular-nums tracking-tight text-[#0A0C10]",
                card.valueClass,
              )}
            >
              {card.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

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
          <article
            key={card.key}
            className="rounded-[14px] border border-[#E6E8EC] bg-white px-4 py-3.5"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
                  card.tone,
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
              </span>
              <p className="min-w-0 text-[13px] font-medium leading-5 text-[#667085]">
                {card.label}
              </p>
            </div>
            <p
              className={cn(
                "mt-2 text-[15px] font-semibold leading-6 tracking-tight text-[#0A0C10] break-words",
                card.valueClass,
              )}
            >
              {card.value}
            </p>
            {card.hint ? (
              <p className="mt-0.5 text-[11px] leading-4 text-[#667085] break-words">{card.hint}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

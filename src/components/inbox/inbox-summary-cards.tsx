import { AlertTriangle, Clock, MessageCircle } from "lucide-react";

import type { InboxSummary } from "@/lib/inbox/inbox-types";
import { cn } from "@/lib/utils";

const CARDS = [
  {
    key: "needsContact" as const,
    label: "Needs contact",
    icon: AlertTriangle,
    tone: "text-red-600 bg-red-50",
  },
  {
    key: "incidents" as const,
    label: "Incidents",
    icon: Clock,
    tone: "text-amber-600 bg-amber-50",
  },
  {
    key: "noResponse" as const,
    label: "No response",
    icon: MessageCircle,
    tone: "text-blue-600 bg-blue-50",
  },
] as const;

export function InboxSummaryCards({ summary }: { summary: InboxSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="flex items-center justify-between rounded-[14px] border border-[#E6E8EC] bg-white px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-full",
                  card.tone,
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="text-[13px] font-medium text-[#667085]">{card.label}</span>
            </div>
            <span className="text-[22px] font-semibold tabular-nums tracking-tight text-[#0A0C10]">
              {summary[card.key]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

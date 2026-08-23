import needsContactIcon from "@/assets/inbox/needs-contact.png";
import incidentsIcon from "@/assets/inbox/incidents.png";
import noResponseIcon from "@/assets/inbox/no-response.png";

import { useT } from "@/lib/i18n/locale-context";
import type { InboxSummary } from "@/lib/inbox/inbox-types";

const CARDS = [
  {
    key: "needsContact" as const,
    labelKey: "inbox.needsContact",
    icon: needsContactIcon,
  },
  {
    key: "incidents" as const,
    labelKey: "inbox.incidents",
    icon: incidentsIcon,
  },
  {
    key: "noResponse" as const,
    labelKey: "inbox.noResponse",
    icon: noResponseIcon,
  },
] as const;

export function InboxSummaryCards({ summary }: { summary: InboxSummary }) {
  const t = useT();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className="flex items-center justify-between rounded-[14px] border border-[#E6E8EC] bg-white px-4 py-3.5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={card.icon}
              alt=""
              width={44}
              height={44}
              className="size-11 shrink-0 object-contain"
              decoding="async"
            />
            <span className="truncate text-[13px] font-medium text-[#667085]">
              {t(card.labelKey)}
            </span>
          </div>
          <span className="shrink-0 text-[22px] font-semibold tabular-nums tracking-tight text-[#0A0C10]">
            {summary[card.key]}
          </span>
        </div>
      ))}
    </div>
  );
}

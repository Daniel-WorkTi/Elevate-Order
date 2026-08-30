import { isSameDay, isToday, isYesterday } from "date-fns";

import { ConfirmationEventRow } from "@/components/inbox/whatsapp/confirmation-event-row";
import { MessageBubble } from "@/components/inbox/whatsapp/message-bubble";
import { dateFnsLocale, parseDisplayDate } from "@/lib/i18n/date-locale";
import { useI18n, useT } from "@/lib/i18n/locale-context";
import type { WhatsAppTimelineItem } from "@/lib/whatsapp/inbox.functions";
import { format } from "date-fns";

function itemCreatedAt(item: WhatsAppTimelineItem): string {
  return item.createdAt;
}

function dayLabel(date: Date, locale: "pt" | "en", t: ReturnType<typeof useT>): string {
  if (isToday(date)) return t("inbox.today");
  if (isYesterday(date)) return t("inbox.whatsapp.yesterday");
  return format(date, "d MMM yyyy", { locale: dateFnsLocale(locale) });
}

export function MessageTimeline({
  timeline,
  onDeleteMessage,
  deletingMessageId,
}: {
  timeline: WhatsAppTimelineItem[];
  onDeleteMessage?: (messageId: string) => void;
  deletingMessageId?: string | null;
}) {
  const t = useT();
  const { locale } = useI18n();

  if (timeline.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-[#98A2B3]">{t("inbox.whatsapp.noMessages")}</p>
    );
  }

  const groups: { label: string; items: WhatsAppTimelineItem[] }[] = [];

  for (const item of timeline) {
    const date = parseDisplayDate(itemCreatedAt(item));
    if (!date) continue;

    const label = dayLabel(date, locale, t);
    const last = groups[groups.length - 1];
    const lastDate = last?.items[0] ? parseDisplayDate(itemCreatedAt(last.items[0]!)) : null;

    if (last && lastDate && isSameDay(lastDate, date) && last.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={`${group.label}-${group.items[0]?.kind}-${itemCreatedAt(group.items[0]!)}`}>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E6E8EC]" />
            <span className="text-[11px] font-medium text-[#98A2B3]">{group.label}</span>
            <div className="h-px flex-1 bg-[#E6E8EC]" />
          </div>
          <div className="space-y-3">
            {group.items.map((item) =>
              item.kind === "confirmation" ? (
                <ConfirmationEventRow key={`confirm-${item.id}`} event={item} />
              ) : (
                <MessageBubble
                  key={item.id}
                  message={item}
                  locale={locale}
                  {...(onDeleteMessage ? { onDelete: onDeleteMessage } : {})}
                  deleting={deletingMessageId === item.id}
                />
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

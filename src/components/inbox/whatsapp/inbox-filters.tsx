import { cn } from "@/lib/utils";
import type { InboxFilterId } from "@/lib/inbox/inbox-display";
import { useT } from "@/lib/i18n/locale-context";

const FILTERS: InboxFilterId[] = ["all", "unread", "to_confirm", "incidents"];

const FILTER_I18N: Record<InboxFilterId, string> = {
  all: "inbox.whatsapp.filter.all",
  unread: "inbox.whatsapp.filter.unread",
  to_confirm: "inbox.whatsapp.filter.toConfirm",
  incidents: "inbox.whatsapp.filter.incidents",
};

export function InboxFilters({
  active,
  counts,
  onChange,
}: {
  active: InboxFilterId;
  counts: Record<InboxFilterId, number>;
  onChange: (filter: InboxFilterId) => void;
}) {
  const t = useT();

  return (
    <div className="flex flex-wrap gap-2 border-b border-[#E6E8EC] px-4 py-3 sm:px-5">
      {FILTERS.map((id) => {
        const count = counts[id];
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors duration-150",
              isActive
                ? "bg-[#2563EB] text-white"
                : "border border-[#E6E8EC] bg-white text-[#344054] hover:bg-[#F7F8FA]",
            )}
          >
            {t(FILTER_I18N[id])}
            {count > 0 ? (
              <span
                className={cn(
                  "inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  isActive ? "bg-white/20 text-white" : "bg-[#F2F4F7] text-[#667085]",
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

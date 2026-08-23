import { Package } from "lucide-react";

import { formatRelativeTimestamp } from "@/lib/format-relative-time";
import { useI18n } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export type ConnectionActivityItem = {
  id: string;
  title: string;
  detail: string;
  at: string | null;
};

export function ConnectionActivity({
  items,
  emptyLabel,
  onViewAll,
}: {
  items: ConnectionActivityItem[];
  emptyLabel: string;
  onViewAll?: () => void;
}) {
  const { locale, t } = useI18n();

  return (
    <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-[#0A0C10]">{t("connections.recentActivity")}</h2>
        {onViewAll && items.length > 0 ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[13px] font-medium text-[#2563EB] hover:text-[#1D4ED8]"
          >
            {t("connections.viewAll")}
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-6 py-6 text-center text-[13px] text-[#667085]">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 divide-y divide-[#E6E8EC]">
          {items.map((item) => {
            const stamp = formatRelativeTimestamp(item.at, { locale, t });
            return (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                  <Package className="size-4" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#0A0C10]">{item.title}</p>
                  <p className="mt-0.5 truncate text-[12px] text-[#667085]">{item.detail}</p>
                </div>
                <span className="hidden shrink-0 text-[12px] text-[#667085] sm:block">
                  {stamp?.relative ?? "—"}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    "border-emerald-200 bg-emerald-50 text-emerald-700",
                  )}
                >
                  {t("connections.success")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

import {
  formatDropeaMetric,
  formatDropeaRelative,
} from "@/lib/integrations/dropea/dropea-format";
import type { DropeaConnectionSummary } from "@/lib/integrations/dropea/dropea-types";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n/locale-context";

export function DropeaStatusSummary({
  summary,
  loading,
}: {
  summary: DropeaConnectionSummary | null;
  loading?: boolean;
}) {
  const { locale, t } = useI18n();

  if (loading || !summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[14px] border border-[#E6E8EC] bg-white px-4 py-3.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: t("connections.lastSyncActivity"),
      value: formatDropeaRelative(summary.lastSyncAt, locale),
    },
    { label: t("connections.ordersSynchronized"), value: formatDropeaMetric(summary.orderCount) },
    { label: t("connections.eventsToday"), value: formatDropeaMetric(summary.eventsToday) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[14px] border border-[#E6E8EC] bg-white px-4 py-3.5"
        >
          <p className="text-[12px] font-medium text-[#667085]">{item.label}</p>
          <p className="mt-2 text-[20px] font-semibold tabular-nums tracking-tight text-[#0A0C10]">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

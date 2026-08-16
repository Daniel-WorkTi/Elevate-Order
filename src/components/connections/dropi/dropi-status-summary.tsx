import {
  formatDropiRelative,
  formatMetricNumber,
} from "@/lib/integrations/dropi/dropi-format";
import type { DropiConnectionSummary } from "@/lib/integrations/dropi/dropi-types";
import { Skeleton } from "@/components/ui/skeleton";

export function DropiStatusSummary({
  summary,
  loading,
}: {
  summary: DropiConnectionSummary | null;
  loading?: boolean;
}) {
  if (loading || !summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
      label: "Last webhook received",
      value: formatDropiRelative(summary.lastWebhookAt),
    },
    {
      label: "Orders synchronized",
      value: formatMetricNumber(summary.orderCount),
    },
    {
      label: "Events today",
      value: formatMetricNumber(summary.eventsToday),
    },
    {
      label: "Failed events",
      value: formatMetricNumber(summary.failedEventsToday),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

import { useMemo, useState } from "react";

import { DropiEventDetail } from "@/components/connections/dropi/dropi-event-detail";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDropiTime } from "@/lib/integrations/dropi/dropi-format";
import type { DropiWebhookEventRow } from "@/lib/integrations/dropi/dropi-types";
import { useI18n } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export function DropiEventsTable({
  events,
  showFilters = false,
  emptyHint,
}: {
  events: DropiWebhookEventRow[];
  showFilters?: boolean;
  emptyHint?: string;
}) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<DropiWebhookEventRow | null>(null);

  const statuses = useMemo(() => {
    return [...new Set(events.map((e) => e.statusName).filter(Boolean) as string[])].sort();
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((event) => {
      if (statusFilter !== "all" && (event.statusName ?? "") !== statusFilter) return false;
      if (q && !String(event.orderId).includes(q)) return false;
      return true;
    });
  }, [events, query, statusFilter]);

  return (
    <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#0A0C10]">
            {t("connections.recentWebhookEvents")}
          </h2>
          <p className="mt-1 text-[13px] text-[#667085]">
            {t("connections.recentWebhookEventsHint")}
          </p>
        </div>
        {showFilters ? (
          <div className="flex flex-wrap gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("connections.searchOrderId")}
              className="h-9 w-[160px] rounded-[10px] border-[#E6E8EC] shadow-none"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[140px] rounded-[10px] border-[#E6E8EC] shadow-none">
                <SelectValue placeholder={t("common.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("connections.allStatuses")}</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-[12px] border border-dashed border-[#E6E8EC] px-4 py-10 text-center">
          <p className="text-[14px] font-medium text-[#0A0C10]">{t("connections.noDropiEvents")}</p>
          <p className="mt-1 text-[13px] text-[#667085]">
            {emptyHint ?? t("connections.configureWebhookHint")}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 hidden overflow-hidden rounded-[12px] border border-[#E6E8EC] md:block">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#F7F8FA] text-[11px] uppercase tracking-wide text-[#667085]">
                <tr>
                  <th className="px-3 py-2.5 font-medium">{t("connections.time")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("connections.event")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("connections.order")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("common.status")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("connections.result")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => (
                  <tr
                    key={event.id}
                    className="cursor-pointer border-t border-[#E6E8EC] hover:bg-[#F7F8FA]/70"
                    onClick={() => setSelected(event)}
                  >
                    <td className="px-3 py-3 tabular-nums text-[#667085]">
                      {formatDropiTime(event.eventDate, locale)}
                    </td>
                    <td className="px-3 py-3 text-[#0A0C10]">order.updated</td>
                    <td className="px-3 py-3 font-medium text-[#0A0C10]">#{event.orderId}</td>
                    <td className="px-3 py-3 text-[#667085]">{event.statusName ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {t("connections.processed")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-2 md:hidden">
            {filtered.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelected(event)}
                className={cn(
                  "w-full rounded-[12px] border border-[#E6E8EC] px-3 py-3 text-left",
                  "hover:bg-[#F7F8FA]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[#0A0C10]">#{event.orderId}</span>
                  <span className="text-[12px] tabular-nums text-[#667085]">
                    {formatDropiTime(event.eventDate, locale)}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-[#667085]">
                  {event.statusName ?? "order.updated"} · {t("connections.processed")}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      <DropiEventDetail event={selected} open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} />
    </section>
  );
}

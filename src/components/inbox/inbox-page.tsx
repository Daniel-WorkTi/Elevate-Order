import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { startOfDay, subDays } from "date-fns";

import { RecoveryDashboard } from "@/components/dashboard/recovery-dashboard";
import { InboxQueueRow } from "@/components/inbox/inbox-queue-row";
import { InboxSupplyTabs } from "@/components/inbox/inbox-supply-tabs";
import {
  InboxQueueFilters,
  InboxToolbar,
  type InboxFilters,
} from "@/components/inbox/inbox-toolbar";
import { Button } from "@/components/ui/button";
import { useDropeaConnectionPreference } from "@/hooks/use-dropea-connection-preference";
import { useDropiConnectionPreference } from "@/hooks/use-dropi-connection-preference";
import { queryInboxQueue } from "@/lib/inbox/inbox.functions";
import { queryRecoveryDashboard } from "@/lib/inbox/recovery.functions";
import { sortInboxItems } from "@/lib/inbox/inbox-types";
import { useT } from "@/lib/i18n/locale-context";
import type { ProfitPeriod } from "@/lib/profits/profits-search";
import type { Supply } from "@/lib/order-domain";

type InboxSupply = Extract<Supply, "dropi" | "dropea">;

const DEFAULT_FILTERS: InboxFilters = {
  range: "7d",
  priority: "all",
  status: "all",
  country: "all",
  sort: "priority",
};

function recoveryQueryInput(filters: InboxFilters): {
  period: ProfitPeriod;
  from?: string;
  to?: string;
} {
  if (filters.range === "custom") {
    const payload: { period: ProfitPeriod; from?: string; to?: string } = { period: "custom" };
    if (filters.from) payload.from = filters.from;
    if (filters.to) payload.to = filters.to;
    return payload;
  }
  if (filters.range === "today") return { period: "today" };
  if (filters.range === "all") return { period: "all" };
  return { period: "7d" };
}

export function InboxPageContent() {
  const t = useT();
  const [supply, setSupply] = useState<InboxSupply>("dropi");
  const [filters, setFilters] = useState<InboxFilters>(DEFAULT_FILTERS);
  const dropi = useDropiConnectionPreference();
  const dropea = useDropeaConnectionPreference();

  const recoveryInput = useMemo(() => recoveryQueryInput(filters), [filters]);
  const recoveryQuery = useQuery({
    queryKey: ["inbox", "recovery", recoveryInput],
    queryFn: () => queryRecoveryDashboard({ data: recoveryInput }),
    placeholderData: keepPreviousData,
  });

  const queueQuery = useQuery({
    queryKey: ["inbox", "queue"],
    queryFn: () => queryInboxQueue(),
    placeholderData: keepPreviousData,
  });

  const periodLabel =
    filters.range === "today"
      ? t("inbox.today")
      : filters.range === "all"
        ? t("inbox.allTime")
        : filters.range === "custom" && filters.from
          ? t("common.custom")
          : t("inbox.recovery.days7");

  const counts = {
    dropi: queueQuery.data?.dropi.length ?? 0,
    dropea: queueQuery.data?.dropea.length ?? 0,
  };

  const supplyItems = supply === "dropea" ? (queueQuery.data?.dropea ?? []) : (queueQuery.data?.dropi ?? []);

  const countries = useMemo(() => {
    return [...new Set(supplyItems.map((item) => item.country).filter((country) => country !== "—"))].sort();
  }, [supplyItems]);

  const filtered = useMemo(() => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;

    if (filters.range === "today") {
      from = startOfDay(now);
    } else if (filters.range === "7d") {
      from = subDays(now, 7);
    } else if (filters.range === "custom") {
      from = filters.from ? new Date(filters.from) : null;
      to = filters.to ? new Date(filters.to) : null;
    }

    return sortInboxItems(
      supplyItems.filter((item) => {
        const updated = new Date(item.updatedAt);
        if (from && updated < from) return false;
        if (to && updated > to) return false;
        if (filters.priority !== "all" && item.priority !== filters.priority) return false;
        if (filters.status === "incident" && item.priority !== "critical") return false;
        if (filters.status === "waiting" && item.priority !== "waiting") return false;
        if (filters.status === "no_response" && item.priority !== "followup") return false;
        if (filters.country !== "all" && item.country !== filters.country) return false;
        return true;
      }),
      filters.sort ?? "priority",
    );
  }, [supplyItems, filters]);

  const queueError = queueQuery.data?.error ?? (queueQuery.isError ? t("inbox.loadError") : null);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <InboxSupplyTabs value={supply} onChange={setSupply} counts={counts} />
        <InboxToolbar filters={filters} countries={countries} onChange={setFilters} />
      </div>

      <RecoveryDashboard
        {...(recoveryQuery.data?.snapshot ? { snapshot: recoveryQuery.data.snapshot } : {})}
        periodLabel={periodLabel}
        connected={{ dropi: dropi.linked, dropea: dropea.linked }}
        fetchedAt={recoveryQuery.data?.fetchedAt ?? null}
        refreshing={recoveryQuery.isFetching}
        onRefresh={() => void recoveryQuery.refetch()}
      />

      <section className="space-y-3">
        <div className="flex flex-col gap-4 rounded-[16px] border border-[#E6E8EC] bg-white px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight text-[#0A0C10]">
                {t("inbox.priorityQueue")}
              </h2>
              <p className="mt-0.5 text-[13px] text-[#667085]">{t("inbox.priorityQueueHint")}</p>
            </div>
            <InboxQueueFilters filters={filters} countries={countries} onChange={setFilters} />
          </div>
        </div>

        <div className="space-y-3">
          {queueQuery.isPending ? (
            <div className="rounded-[14px] border border-[#E6E8EC] bg-white py-16 text-center">
              <p className="text-[14px] font-medium text-[#0A0C10]">{t("inbox.loadingQueue")}</p>
            </div>
          ) : queueError ? (
            <div className="rounded-[14px] border border-[#E6E8EC] bg-white py-16 text-center">
              <p className="text-[14px] font-medium text-[#0A0C10]">{t("inbox.loadError")}</p>
              <p className="mt-1 text-[13px] text-[#667085]">{queueError}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 h-9 rounded-[10px] text-[13px] shadow-none"
                onClick={() => void queueQuery.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : supplyItems.length === 0 ? (
            <div className="rounded-[14px] border border-[#E6E8EC] bg-white py-16 text-center">
              <p className="text-[14px] font-medium text-[#0A0C10]">{t("inbox.emptyTitle")}</p>
              <p className="mt-1 text-[13px] text-[#667085]">{t("inbox.emptyQueueHint")}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[14px] border border-[#E6E8EC] bg-white py-16 text-center">
              <p className="text-[14px] font-medium text-[#0A0C10]">{t("inbox.emptyTitle")}</p>
              <p className="mt-1 text-[13px] text-[#667085]">{t("inbox.emptyHint")}</p>
            </div>
          ) : (
            filtered.map((item) => <InboxQueueRow key={item.id} item={item} />)
          )}
        </div>
      </section>
    </div>
  );
}

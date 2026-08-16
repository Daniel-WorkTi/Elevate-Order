import { useMemo, useState } from "react";
import { startOfDay, subDays } from "date-fns";

import { InboxQueueRow } from "@/components/inbox/inbox-queue-row";
import { InboxSummaryCards } from "@/components/inbox/inbox-summary-cards";
import { InboxSupplyTabs } from "@/components/inbox/inbox-supply-tabs";
import {
  InboxQueueFilters,
  InboxToolbar,
  type InboxFilters,
} from "@/components/inbox/inbox-toolbar";
import { inboxItemsForSupply } from "@/lib/inbox/inbox-demo";
import { sortInboxPriority, summarizeInbox } from "@/lib/inbox/inbox-types";
import type { Supply } from "@/lib/order-domain";

type InboxSupply = Extract<Supply, "dropi" | "dropea">;

const DEFAULT_FILTERS: InboxFilters = {
  range: "today",
  priority: "all",
  status: "all",
  country: "all",
};

export function InboxPageContent() {
  const [supply, setSupply] = useState<InboxSupply>("dropi");
  const [filters, setFilters] = useState<InboxFilters>(DEFAULT_FILTERS);

  const counts = useMemo(
    () => ({
      dropi: inboxItemsForSupply("dropi").length,
      dropea: inboxItemsForSupply("dropea").length,
    }),
    [],
  );

  const supplyItems = useMemo(() => inboxItemsForSupply(supply), [supply]);

  const countries = useMemo(() => {
    return [...new Set(supplyItems.map((item) => item.country))].sort();
  }, [supplyItems]);

  const filtered = useMemo(() => {
    const now = new Date();
    const from =
      filters.range === "today"
        ? startOfDay(now)
        : filters.range === "7d"
          ? subDays(now, 7)
          : null;

    return sortInboxPriority(
      supplyItems.filter((item) => {
        if (from && new Date(item.updatedAt) < from) return false;
        if (filters.priority !== "all" && item.priority !== filters.priority) return false;
        if (filters.status === "incident" && item.priority !== "critical") return false;
        if (filters.status === "waiting" && item.priority !== "waiting") return false;
        if (filters.status === "no_response" && item.priority !== "followup") return false;
        if (filters.country !== "all" && item.country !== filters.country) return false;
        return true;
      }),
    );
  }, [supplyItems, filters]);

  const summary = useMemo(() => summarizeInbox(filtered), [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <InboxSupplyTabs value={supply} onChange={setSupply} counts={counts} />
        <InboxToolbar filters={filters} countries={countries} onChange={setFilters} />
      </div>

      <InboxSummaryCards summary={summary} />

      <section className="rounded-[16px] border border-[#E6E8EC] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E6E8EC] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-[#0A0C10]">
              Priority queue
            </h2>
            <p className="mt-0.5 text-[13px] text-[#667085]">
              Incidents and unanswered orders first
            </p>
          </div>
          <InboxQueueFilters filters={filters} countries={countries} onChange={setFilters} />
        </div>

        <div className="px-4 sm:px-5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[14px] font-medium text-[#0A0C10]">No orders need attention</p>
              <p className="mt-1 text-[13px] text-[#667085]">
                Try another supply tab or clear filters.
              </p>
            </div>
          ) : (
            filtered.map((item) => <InboxQueueRow key={item.id} item={item} />)
          )}
        </div>
      </section>
    </div>
  );
}

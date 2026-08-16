import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

import { AppShell } from "@/components/app-shell";
import { FinancialSummaryPanel } from "@/components/profits/financial-summary";
import { ProfitsChart } from "@/components/profits/profits-chart";
import { ProfitsEmptyState } from "@/components/profits/profits-empty-state";
import { ProfitsFilters } from "@/components/profits/profits-filters";
import { ProfitsSkeleton } from "@/components/profits/profits-skeleton";
import { ProfitsTable } from "@/components/profits/profits-table";
import { SupplyBreakdown } from "@/components/profits/supply-breakdown";
import { Button } from "@/components/ui/button";
import { useProfitExchangeRates } from "@/hooks/use-profit-exchange-rates";
import { formatRelativeTimestamp } from "@/lib/format-relative-time";
import { queryProfitsOrders } from "@/lib/profits.functions";
import {
  aggregateFinancials,
  buildRevenueChart,
  buildSupplyBreakdown,
} from "@/lib/profits/aggregate";
import { profitsSearchSchema, type ProfitsSearch } from "@/lib/profits/profits-search";

export const Route = createFileRoute("/profits")({
  validateSearch: profitsSearchSchema,
  head: () => ({
    meta: [
      { title: "Profits — ELEVATE" },
      {
        name: "description",
        content: "Understand the financial result of your synchronized orders.",
      },
    ],
  }),
  component: ProfitsPage,
});

function ProfitsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/profits" });

  const query = useQuery({
    queryKey: ["profits", search.supply, search.period, search.from, search.to],
    queryFn: () => {
      const payload: {
        supply: typeof search.supply;
        period: typeof search.period;
        from?: string;
        to?: string;
      } = {
        supply: search.supply,
        period: search.period,
      };
      if (search.from) payload.from = search.from;
      if (search.to) payload.to = search.to;
      return queryProfitsOrders({ data: payload });
    },
    placeholderData: keepPreviousData,
  });

  const fx = useProfitExchangeRates(search.currency);
  const orders = query.data?.orders ?? [];
  const meta = query.data?.meta;
  const costsAvailable = meta?.hasCostData ?? false;
  const feesAvailable = meta?.hasFeeData ?? false;

  const summary = useMemo(
    () =>
      aggregateFinancials(orders, search.currency, fx.rateMap, {
        costsAvailable,
        feesAvailable,
      }),
    [orders, search.currency, fx.rateMap, costsAvailable, feesAvailable],
  );

  const chartPoints = useMemo(
    () => buildRevenueChart(orders, search.period, search.currency, fx.rateMap),
    [orders, search.period, search.currency, fx.rateMap],
  );

  const breakdown = useMemo(
    () =>
      buildSupplyBreakdown(orders, search.currency, fx.rateMap, {
        costsAvailable,
        feesAvailable,
      }),
    [orders, search.currency, fx.rateMap, costsAvailable, feesAvailable],
  );

  const maxRevenue = Math.max(0, ...breakdown.map((row) => row.revenue ?? 0));

  const ratesLabel = (() => {
    if (search.currency === "EUR") {
      return "Amounts in EUR — no conversion needed.";
    }
    if (fx.error) return fx.error;
    const stamp = formatRelativeTimestamp(fx.updatedAt?.toISOString() ?? null);
    if (stamp) return `Rates updated ${stamp.relative.toLowerCase()}`;
    return "Exchange rates loading…";
  })();

  function setSearch(next: ProfitsSearch) {
    void navigate({ search: next });
  }

  function clearFilters() {
    setSearch({
      supply: "all",
      period: "all",
      currency: search.currency,
    });
  }

  function showAllTime() {
    setSearch({
      supply: search.supply,
      period: "all",
      currency: search.currency,
    });
  }

  const showSkeleton = query.isPending && !query.data;
  const loadError = query.data?.error ?? (query.isError ? "Unable to load profit data." : null);
  const empty = !showSkeleton && !loadError && orders.length === 0;
  const supplyMatchCount = query.data?.meta.supplyMatchCount ?? 0;

  return (
    <AppShell
      title="Profits"
      subtitle="Understand the financial result of your synchronized orders."
    >
      <div className="space-y-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Profits</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Understand the financial result of your synchronized orders.
          </p>
        </div>

        <ProfitsFilters search={search} onChange={setSearch} ratesLabel={ratesLabel} />

        {showSkeleton ? <ProfitsSkeleton /> : null}

        {!showSkeleton && loadError ? (
          <div className="rounded-[16px] border border-border bg-card px-6 py-14 text-center">
            <p className="text-[15px] font-medium text-foreground">Unable to load profit data.</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{loadError}</p>
            <Button
              type="button"
              className="mt-5 h-9 rounded-[10px] text-[13px] shadow-none"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!showSkeleton && !loadError && empty ? (
          <ProfitsEmptyState
            onClear={clearFilters}
            onShowAllTime={showAllTime}
            supplyMatchCount={supplyMatchCount}
          />
        ) : null}

        {!showSkeleton && !loadError && !empty ? (
          <>
            <FinancialSummaryPanel summary={summary} missingCostCount={orders.length} />

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
              <ProfitsChart points={chartPoints} currency={search.currency} />
              <SupplyBreakdown rows={breakdown} maxRevenue={maxRevenue} />
            </div>

            <ProfitsTable
              orders={orders}
              displayCurrency={search.currency}
              rateMap={fx.rateMap}
              costsAvailable={costsAvailable}
              feesAvailable={feesAvailable}
            />
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

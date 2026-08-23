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
import { useCurrencyPreference } from "@/hooks/use-currency-preference";
import { useProfitExchangeRates } from "@/hooks/use-profit-exchange-rates";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { formatRelativeTimestamp } from "@/lib/format-relative-time";
import { queryProfitsOrders } from "@/lib/profits.functions";
import {
  aggregateFinancials,
  buildRevenueChart,
  buildSupplyBreakdown,
} from "@/lib/profits/aggregate";
import { profitsSearchSchema, type ProfitsSearch } from "@/lib/profits/profits-search";
import { useI18n } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";

export const Route = createFileRoute("/profits")({
  validateSearch: profitsSearchSchema,
  head: () => ({
    meta: [
      { title: metaT("meta.profitsTitle") },
      { name: "description", content: metaT("meta.profitsDescription") },
    ],
  }),
  component: ProfitsPage,
});

function ProfitsPage() {
  const { locale, t } = useI18n();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/profits" });
  const { workspaceId } = useWorkspaceId();

  const query = useQuery({
    queryKey: ["profits", search.supply, search.period, search.from, search.to, workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => {
      const payload: {
        supply: typeof search.supply;
        period: typeof search.period;
        from?: string;
        to?: string;
        workspaceId: string;
      } = {
        supply: search.supply,
        period: search.period,
        workspaceId,
      };
      if (search.from) payload.from = search.from;
      if (search.to) payload.to = search.to;
      return queryProfitsOrders({ data: payload });
    },
    placeholderData: keepPreviousData,
  });

  const { displayCurrency } = useCurrencyPreference();
  const fx = useProfitExchangeRates(displayCurrency);
  const orders = query.data?.orders ?? [];
  const meta = query.data?.meta;
  const costsAvailable = meta?.hasCostData ?? false;
  const feesAvailable = meta?.hasFeeData ?? false;

  const summary = useMemo(
    () =>
      aggregateFinancials(orders, displayCurrency, fx.rateMap, {
        costsAvailable,
        feesAvailable,
      }),
    [orders, displayCurrency, fx.rateMap, costsAvailable, feesAvailable],
  );

  const chartPoints = useMemo(
    () => buildRevenueChart(orders, search.period, displayCurrency, fx.rateMap, locale),
    [orders, search.period, displayCurrency, fx.rateMap, locale],
  );

  const breakdown = useMemo(
    () =>
      buildSupplyBreakdown(orders, displayCurrency, fx.rateMap, {
        costsAvailable,
        feesAvailable,
      }),
    [orders, displayCurrency, fx.rateMap, costsAvailable, feesAvailable],
  );

  const maxRevenue = Math.max(0, ...breakdown.map((row) => row.revenue ?? 0));

  const ratesLabel = (() => {
    if (displayCurrency === "EUR") {
      return t("profits.ratesEur");
    }
    if (fx.error) return fx.error;
    const stamp = formatRelativeTimestamp(fx.updatedAt?.toISOString() ?? null, { locale, t });
    if (stamp) {
      return t("profits.ratesUpdated", { relative: stamp.relative.toLowerCase() });
    }
    return t("profits.ratesLoading");
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
  const loadError = query.data?.error ?? (query.isError ? t("profits.loadError") : null);
  const empty = !showSkeleton && !loadError && orders.length === 0;
  const supplyMatchCount = query.data?.meta.supplyMatchCount ?? 0;

  return (
    <AppShell title={t("profits.title")} subtitle={t("profits.subtitle")}>
      <div className="space-y-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            {t("profits.title")}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{t("profits.subtitle")}</p>
        </div>

        <ProfitsFilters
          search={search}
          onChange={setSearch}
          ratesLabel={ratesLabel}
          displayCurrency={displayCurrency}
        />

        {showSkeleton ? <ProfitsSkeleton /> : null}

        {!showSkeleton && loadError ? (
          <div className="rounded-[16px] border border-border bg-card px-6 py-14 text-center">
            <p className="text-[15px] font-medium text-foreground">{t("profits.loadError")}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{loadError}</p>
            <Button
              type="button"
              className="mt-5 h-9 rounded-[10px] text-[13px] shadow-none"
              onClick={() => void query.refetch()}
            >
              {t("common.retry")}
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
              <ProfitsChart points={chartPoints} currency={displayCurrency} />
              <SupplyBreakdown rows={breakdown} maxRevenue={maxRevenue} />
            </div>

            <ProfitsTable
              orders={orders}
              displayCurrency={displayCurrency}
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

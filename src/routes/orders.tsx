import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { OrdersPageHeader } from "@/components/orders/orders-page-header";
import { OrdersTable } from "@/components/orders/orders-table";
import { OrdersTableSkeleton } from "@/components/orders/orders-table-skeleton";
import { OrdersToolbar } from "@/components/orders/orders-toolbar";
import { Button } from "@/components/ui/button";
import { querySyncedOrders } from "@/lib/synced-orders.functions";
import {
  ordersSearchSchema,
  searchToQuery,
  withSupply,
  type OrdersSearch,
} from "@/lib/orders-search";
import { useCurrencyPreference } from "@/hooks/use-currency-preference";
import { useEurRateTable } from "@/hooks/use-eur-rate-table";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";

function ordersListQuery(search: OrdersSearch) {
  const input = searchToQuery(search);
  return queryOptions({
    queryKey: ["orders", input],
    queryFn: () => querySyncedOrders({ data: input }),
    placeholderData: keepPreviousData,
  });
}

export const Route = createFileRoute("/orders")({
  validateSearch: ordersSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(ordersListQuery(deps)),
  pendingComponent: OrdersPending,
  errorComponent: OrdersError,
  head: () => ({
    meta: [
      { title: metaT("meta.ordersTitle") },
      { name: "description", content: metaT("meta.ordersDescription") },
    ],
  }),
  component: OrdersPage,
});

function OrdersPending() {
  const t = useT();
  return (
    <AppShell title={t("orders.title")} subtitle={t("orders.subtitle")}>
      <OrdersTableSkeleton />
    </AppShell>
  );
}

function OrdersError({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <AppShell title={t("orders.title")} subtitle={t("orders.subtitle")}>
      <div className="rounded-[16px] border border-border bg-card px-6 py-16 text-center">
        <p className="text-[15px] font-medium text-foreground">{t("orders.loadError")}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {t("orders.workspaceStillAvailable")}
        </p>
        <Button
          type="button"
          onClick={reset}
          className="mt-5 h-9 rounded-[10px] text-[13px] shadow-none"
        >
          {t("common.retry")}
        </Button>
      </div>
    </AppShell>
  );
}

function OrdersPage() {
  const t = useT();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/orders" });
  const query = useQuery(ordersListQuery(search));
  const { displayCurrency } = useCurrencyPreference();
  const fxTable = useEurRateTable();

  const setSearch = (next: OrdersSearch) => {
    void navigate({ search: next });
  };

  const result = query.data;
  const showSkeleton = query.isPending && !result;

  return (
    <AppShell title={t("orders.title")} subtitle={t("orders.subtitle")}>
      <div className="space-y-4">
        <div className="sticky top-0 z-10 -mx-4 space-y-3 bg-background px-4 py-1 md:static md:mx-0 md:space-y-4 md:bg-transparent md:px-0 md:py-0">
          <OrdersPageHeader
            supply={search.supply}
            onSupplyChange={(supply) => setSearch(withSupply(search, supply))}
            onRefresh={() => void query.refetch()}
            refreshing={query.isFetching}
          />
          <OrdersToolbar
            search={search}
            facets={result?.facets ?? { statuses: [], shippingCompanies: [], countries: [] }}
            onChange={setSearch}
          />
        </div>

        {showSkeleton ? (
          <OrdersTableSkeleton />
        ) : (
          <OrdersTable
            orders={result?.orders ?? []}
            search={search}
            total={result?.total ?? 0}
            pageCount={result?.pageCount ?? 1}
            fx={{ to: displayCurrency, rateMap: fxTable.rateMap }}
            error={result?.error ?? (query.isError ? t("orders.loadError") : null)}
            onRetry={() => void query.refetch()}
            onSearchChange={setSearch}
          />
        )}
      </div>
    </AppShell>
  );
}

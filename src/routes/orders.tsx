import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { useExchangeRate } from "@/components/app-shell/use-exchange-rate";
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
      { title: "Orders — ELEVATE" },
      {
        name: "description",
        content: "All synchronized orders from Dropi or Dropea.",
      },
    ],
  }),
  component: OrdersPage,
});

function OrdersPending() {
  return (
    <AppShell title="Orders" subtitle="All synchronized orders.">
      <OrdersTableSkeleton />
    </AppShell>
  );
}

function OrdersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AppShell title="Orders" subtitle="All synchronized orders.">
      <div className="rounded-[16px] border border-border bg-card px-6 py-16 text-center">
        <p className="text-[15px] font-medium text-foreground">Unable to load orders.</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          The rest of the workspace is still available.
        </p>
        <Button
          type="button"
          onClick={reset}
          className="mt-5 h-9 rounded-[10px] text-[13px] shadow-none"
        >
          Retry
        </Button>
      </div>
    </AppShell>
  );
}

function OrdersPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/orders" });
  const query = useQuery(ordersListQuery(search));
  const fx = useExchangeRate("EUR", "BRL");

  const setSearch = (next: OrdersSearch) => {
    void navigate({ search: next });
  };

  const result = query.data;
  const showSkeleton = query.isPending && !result;

  return (
    <AppShell title="Orders" subtitle="All synchronized orders.">
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
            fx={fx.rate !== null ? { to: "BRL", rate: fx.rate } : undefined}
            error={result?.error ?? (query.isError ? "Unable to load orders." : null)}
            onRetry={() => void query.refetch()}
            onSearchChange={setSearch}
          />
        )}
      </div>
    </AppShell>
  );
}

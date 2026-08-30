import { keepPreviousData, queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { OrdersPageHeader } from "@/components/orders/orders-page-header";
import { OrdersCodTabs } from "@/components/orders/orders-cod-tabs";
import { OrdersTable } from "@/components/orders/orders-table";
import { OrdersTableSkeleton } from "@/components/orders/orders-table-skeleton";
import { OrdersToolbar } from "@/components/orders/orders-toolbar";
import { Button } from "@/components/ui/button";
import { useCurrencyPreference } from "@/hooks/use-currency-preference";
import { useEurRateTable } from "@/hooks/use-eur-rate-table";
import { useStoreConnectionPreference } from "@/hooks/use-store-connection-preference";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { supabase } from "@/integrations/supabase/client";
import { syncConnectedShopifyStore } from "@/lib/integrations/shopify/oauth.functions";
import { syncShopifyOrders } from "@/lib/integrations/shopify/shopify.functions";
import { querySyncedOrders } from "@/lib/synced-orders.functions";
import {
  searchToQuery,
  withSupply,
  type OrdersSearch,
} from "@/lib/orders-search";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";
import type { Supply } from "@/lib/order-domain";

const ordersRoute = getRouteApi("/orders");

const EMPTY_FACETS = {
  statuses: [] as string[],
  shippingCompanies: [] as string[],
  countries: [] as string[],
};

function ordersListQuery(search: OrdersSearch, workspaceId: string) {
  const input = { ...searchToQuery(search), workspaceId };
  return queryOptions({
    queryKey: ["orders", input],
    queryFn: async () => {
      try {
        return await querySyncedOrders({ data: input });
      } catch (error) {
        return {
          orders: [],
          total: 0,
          page: input.page,
          pageSize: input.pageSize,
          pageCount: 1,
          facets: EMPTY_FACETS,
          error: error instanceof Error ? error.message : "Unable to load orders.",
        };
      }
    },
    enabled: Boolean(workspaceId),
    placeholderData: keepPreviousData,
  });
}

function OrdersError({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <AppShell title={t("orders.title")} subtitle={t("orders.subtitle")}>
      <div className="rounded-[16px] border border-border bg-card px-6 py-16 text-center">
        <p className="text-[15px] font-medium text-foreground">{t("orders.loadError")}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("orders.workspaceStillAvailable")}</p>
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

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: metaT("meta.ordersTitle") },
      { name: "description", content: metaT("meta.ordersDescription") },
    ],
  }),
  component: OrdersPage,
  errorComponent: OrdersError,
});

function operationalSupply(supply: Supply): Exclude<Supply, "shopify"> {
  return supply === "dropea" ? "dropea" : "dropi";
}

function importedToast(
  t: (key: string, params?: Record<string, string | number>) => string,
  imported: number,
  enriched: number,
) {
  if (imported === 0 && enriched === 0) {
    toast.success(t("orders.syncedNone"));
    return;
  }
  const importedLabel =
    imported === 1
      ? t("connections.importedOrdersOne", { count: imported })
      : t("connections.importedOrders", { count: imported });
  toast.success(
    importedLabel + (enriched > 0 ? t("connections.enrichedSupply", { count: enriched }) : ""),
  );
}

function OrdersPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const search = ordersRoute.useSearch();
  const navigate = useNavigate({ from: "/orders/" });
  const { workspaceId } = useWorkspaceId();
  const query = useQuery(ordersListQuery(search, workspaceId));
  const { displayCurrency } = useCurrencyPreference();
  const fxTable = useEurRateTable();
  const store = useStoreConnectionPreference();
  const [syncing, setSyncing] = useState(false);
  const supply = operationalSupply(search.supply);

  useEffect(() => {
    if (!workspaceId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const invalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["orders"] });
      }, 600);
    };

    const channel = supabase
      .channel(`orders-cod-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_confirmation_events",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        invalidate,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);

  const setSearch = (next: OrdersSearch) => {
    void navigate({ search: next });
  };

  async function refresh() {
    setSyncing(true);
    try {
      if (supply !== "dropea") {
        const oauth = await syncConnectedShopifyStore({
          data: workspaceId ? { workspaceId } : {},
        });
        if (oauth.ok) {
          importedToast(t, oauth.imported, oauth.enriched);
        } else if (oauth.error && oauth.error !== "No Shopify store connected.") {
          toast.error(oauth.error);
        } else {
          const token = store.getAccessToken();
          if (store.storeDomain && token) {
            const result = await syncShopifyOrders({
              data: {
                storeDomain: store.storeDomain,
                accessToken: token,
                limit: 50,
                ...(workspaceId ? { workspaceId } : {}),
              },
            });
            if (!result.ok) {
              toast.error(result.error ?? t("connections.shopifySyncFailed"));
            } else {
              importedToast(t, result.imported, result.enriched);
            }
          } else {
            toast.message(t("orders.refreshNeedsShopify"));
          }
        }
      }
      await query.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("connections.shopifySyncFailed"));
    } finally {
      setSyncing(false);
    }
  }

  const result = query.data;
  const showSkeleton = query.isPending && !result;

  return (
    <AppShell title={t("orders.title")} subtitle={t("orders.subtitle")}>
      <div className="space-y-4">
        <div className="sticky top-0 z-10 -mx-4 space-y-3 bg-background px-4 py-1 md:static md:mx-0 md:space-y-4 md:bg-transparent md:px-0 md:py-0">
          <OrdersPageHeader
            supply={supply}
            onSupplyChange={(next) => setSearch(withSupply(search, next))}
            onRefresh={() => void refresh()}
            refreshing={query.isFetching || syncing}
          />
          <OrdersCodTabs
            active={search.codReply ?? "all"}
            {...(result?.codReplyCounts ? { counts: result.codReplyCounts } : {})}
            supply={supply}
            onChange={(codReply) => setSearch({ ...search, codReply, page: 1 })}
          />
          {search.codReply === "dropi_pending" ? (
            <p className="rounded-[10px] border border-[#E6E8EC] bg-[#FAFBFC] px-3 py-2 text-[12px] text-[#667085]">
              {t("orders.codReply.hintDropiPending")}
            </p>
          ) : null}
          {search.codReply === "yes" ? (
            <p className="rounded-[10px] border border-[#E6E8EC] bg-[#FAFBFC] px-3 py-2 text-[12px] text-[#667085]">
              {t("orders.codReply.hintYes")}
            </p>
          ) : null}
          <OrdersToolbar
            search={search}
            facets={result?.facets ?? EMPTY_FACETS}
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

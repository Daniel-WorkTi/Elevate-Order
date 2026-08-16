import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StoreConnectPanel } from "@/components/connections/store/store-connect-panel";
import { ConnectionSyncPanel } from "@/components/connections/workspace/connection-sync-panel";
import { ConnectionStatCards } from "@/components/connections/workspace/connection-stat-cards";
import { buildConnectionStatCards } from "@/components/connections/workspace/build-connection-stats";
import shopifyMark from "@/assets/shopify-mark.png";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreConnectionPreference } from "@/hooks/use-store-connection-preference";
import {
  getShopifyDashboard,
  syncShopifyOrders,
} from "@/lib/integrations/shopify/shopify.functions";
import { formatDropiDateTime, formatDropiRelative, formatMetricNumber } from "@/lib/integrations/dropi/dropi-format";
import { cn } from "@/lib/utils";

const shopifyDashboardQuery = queryOptions({
  queryKey: ["connections", "shopify", "dashboard"],
  queryFn: () => getShopifyDashboard(),
  placeholderData: keepPreviousData,
});

export const Route = createFileRoute("/connections/shopify")({
  loader: ({ context }) => context.queryClient.ensureQueryData(shopifyDashboardQuery),
  head: () => ({
    meta: [
      { title: "Store — Connections — ELEVATE" },
      {
        name: "description",
        content: "Connect your Shopify store and sync complete orders into ELEVATE.",
      },
    ],
  }),
  component: StoreConnectionPage,
});

function StoreConnectionPage() {
  const query = useQuery(shopifyDashboardQuery);
  const {
    linked,
    storeName,
    storeDomain,
    accessTokenConfigured,
    getAccessToken,
    connect,
    disconnect,
  } = useStoreConnectionPreference();
  const [syncing, setSyncing] = useState(false);

  const summary = query.data?.summary;
  const loading = query.isPending && !summary;
  const fullyLinked = linked && accessTokenConfigured && Boolean(storeDomain);

  const stats = useMemo(() => {
    if (!summary) return [];
    return buildConnectionStatCards({
      lastSyncRelative: formatDropiRelative(summary.lastSyncAt),
      lastSyncExact: summary.lastSyncAt
        ? formatDropiDateTime(summary.lastSyncAt)
        : "No activity yet",
      orderCount: formatMetricNumber(summary.orderCount),
      supplyLabel: "Shopify",
      status: fullyLinked
        ? summary.status === "not_configured"
          ? "configured"
          : summary.status
        : "not_configured",
      ...(summary.errorMessage ? { errorMessage: summary.errorMessage } : {}),
      lastSyncLabel: "Last sync",
      waitingHint: "Waiting for the first sync",
    });
  }, [summary, fullyLinked]);

  async function runSync() {
    const token = getAccessToken();
    if (!storeDomain || !token) {
      toast.error("Connect the store with an Admin API token first");
      return;
    }
    setSyncing(true);
    try {
      const result = await syncShopifyOrders({
        data: { storeDomain, accessToken: token, limit: 50 },
      });
      await query.refetch();
      if (!result.ok) {
        toast.error(result.error ?? "Shopify sync failed");
        return;
      }
      toast.success(
        `Imported ${result.imported} order${result.imported === 1 ? "" : "s"}` +
          (result.enriched > 0 ? ` · enriched ${result.enriched} supply order(s)` : ""),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Shopify sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <AppShell title="Connections" subtitle="Store, Dropi webhook and Dropea API">
      <div className="space-y-5">
        <div className="space-y-3">
          <Link
            to="/connections"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#667085] hover:text-[#0A0C10]"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            Connections
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center overflow-hidden rounded-[10px] border border-[#E6E8EC] bg-white">
                <img src={shopifyMark} alt="" width={28} height={28} className="size-7 object-contain" />
              </span>
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-[#0A0C10]">
                  Shopify store
                </h1>
                <p className="mt-1 text-[13px] text-[#667085]">
                  Pull complete orders into ELEVATE
                </p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                fullyLinked
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-[#E6E8EC] bg-[#F7F8FA] text-[#667085]",
              )}
            >
              <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />
              {fullyLinked ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-24 w-full rounded-[14px]" />
        ) : (
          <ConnectionStatCards cards={stats} />
        )}

        <StoreConnectPanel
          linked={linked}
          storeName={storeName}
          storeDomain={storeDomain}
          accessTokenConfigured={accessTokenConfigured}
          onConnect={connect}
          onDisconnect={disconnect}
        />

        {fullyLinked ? (
          <ConnectionSyncPanel
            title="Synchronization"
            description="ELEVATE pulls Shopify orders with customer, phone, address, products and tracking — then enriches Dropi/Dropea rows that share the same shopify_order_id."
            checks={[
              { label: "Store linked", ok: linked },
              { label: "Admin API token configured", ok: accessTokenConfigured },
              {
                label: summary?.lastSyncAt
                  ? `Last sync ${formatDropiRelative(summary.lastSyncAt)}`
                  : "Waiting for the first sync",
                ok: Boolean(summary?.lastSyncAt),
              },
              {
                label:
                  summary?.status === "error"
                    ? "Synchronization has problems"
                    : "No synchronization problems",
                ok: summary?.status !== "error",
              },
            ]}
            refreshing={syncing || query.isFetching}
            onRefresh={() => void runSync()}
            onTest={() => {
              if (fullyLinked) {
                toast.success("Shopify store credentials are saved");
                return;
              }
              toast.error("Store is not fully connected");
            }}
            onDisconnect={disconnect}
            refreshLabel="Sync now"
          />
        ) : null}

        <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
          <h2 className="text-[15px] font-semibold text-[#0A0C10]">Data imported</h2>
          <p className="mt-1 text-[13px] text-[#667085]">
            Same operational fields as Dropi / Dropea snapshots:
          </p>
          <ul className="mt-3 grid gap-2 text-[13px] text-[#0A0C10] sm:grid-cols-2">
            {[
              "customer_name, phone, email",
              "city, postal_code, address, country",
              "product_summary, total, currency",
              "status_name, tracking_code / url, shipping_company",
              "shopify_order_id (links supply webhooks)",
            ].map((item) => (
              <li key={item} className="rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Button asChild variant="outline" className="h-9 rounded-[10px] text-[13px] shadow-none">
              <Link to="/orders" search={{ supply: "shopify" }}>
                Open Shopify orders
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

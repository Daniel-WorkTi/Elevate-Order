import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi, Link, useNavigate } from "@tanstack/react-router";
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
  testShopifyConnection,
} from "@/lib/integrations/shopify/shopify.functions";
import {
  disconnectShopifyStore,
  getShopifyOauthStatus,
  syncConnectedShopifyStore,
} from "@/lib/integrations/shopify/oauth.functions";
import {
  formatDropiDateTime,
  formatDropiRelative,
  formatMetricNumber,
} from "@/lib/integrations/dropi/dropi-format";
import { useI18n } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";
import { cn } from "@/lib/utils";

const connectionsRoute = getRouteApi("/connections");

const shopifyOauthQuery = queryOptions({
  queryKey: ["connections", "shopify", "oauth"],
  queryFn: () => getShopifyOauthStatus(),
});

const shopifyDashboardQuery = queryOptions({
  queryKey: ["connections", "shopify", "dashboard"],
  queryFn: () => getShopifyDashboard(),
  placeholderData: keepPreviousData,
});

export const Route = createFileRoute("/connections/shopify")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(shopifyDashboardQuery),
      context.queryClient.ensureQueryData(shopifyOauthQuery),
    ]),
  head: () => ({
    meta: [
      { title: metaT("meta.shopifyTitle") },
      { name: "description", content: metaT("meta.shopifyDescription") },
    ],
  }),
  component: StoreConnectionPage,
});

function StoreConnectionPage() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const { error: oauthError } = connectionsRoute.useSearch();
  const query = useQuery(shopifyDashboardQuery);
  const oauthQuery = useQuery(shopifyOauthQuery);
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
  const [testing, setTesting] = useState(false);

  const summary = query.data?.summary;
  const oauth = oauthQuery.data;
  const loading = (query.isPending && !summary) || oauthQuery.isPending;
  const oauthLinked = Boolean(oauth?.connected && oauth.shopDomain);
  const fullyLinked = oauthLinked || (linked && accessTokenConfigured && Boolean(storeDomain));

  const stats = useMemo(() => {
    if (!summary) return [];
    return buildConnectionStatCards({
      lastSyncRelative: formatDropiRelative(oauth?.lastSyncAt ?? summary.lastSyncAt, locale),
      lastSyncExact:
        (oauth?.lastSyncAt ?? summary?.lastSyncAt)
          ? formatDropiDateTime(oauth?.lastSyncAt ?? summary?.lastSyncAt ?? "", locale)
          : t("connections.noActivityYet"),
      orderCount: formatMetricNumber(oauth?.orderCount ?? summary?.orderCount),
      supplyLabel: "Shopify",
      status: fullyLinked
        ? summary.status === "not_configured"
          ? "configured"
          : summary.status
        : "not_configured",
      ...(summary.errorMessage ? { errorMessage: summary.errorMessage } : {}),
      lastSyncLabel: t("connections.lastSync"),
      waitingHint: t("connections.waitingFirstSync"),
      t,
    });
  }, [summary, oauth, fullyLinked, locale, t]);

  async function runSync() {
    setSyncing(true);
    try {
      if (oauthLinked) {
        const result = await syncConnectedShopifyStore();
        await Promise.all([query.refetch(), oauthQuery.refetch()]);
        if (!result.ok) {
          toast.error(result.error ?? t("connections.shopifySyncFailed"));
          return;
        }
        const imported =
          result.imported === 1
            ? t("connections.importedOrdersOne", { count: result.imported })
            : t("connections.importedOrders", { count: result.imported });
        toast.success(
          imported +
            (result.enriched > 0
              ? t("connections.enrichedSupply", { count: result.enriched })
              : ""),
        );
        return;
      }

      const token = getAccessToken();
      if (!storeDomain || !token) {
        toast.error(t("connections.connectStoreFirst"));
        return;
      }
      const result = await syncShopifyOrders({
        data: { storeDomain, accessToken: token, limit: 50 },
      });
      await query.refetch();
      if (!result.ok) {
        toast.error(result.error ?? t("connections.shopifySyncFailed"));
        return;
      }
      const imported =
        result.imported === 1
          ? t("connections.importedOrdersOne", { count: result.imported })
          : t("connections.importedOrders", { count: result.imported });
      toast.success(
        imported +
          (result.enriched > 0 ? t("connections.enrichedSupply", { count: result.enriched }) : ""),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("connections.shopifySyncFailed"));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <AppShell title={t("connections.title")} subtitle={t("connections.subtitle")}>
      <div className="space-y-5">
        <div className="space-y-3">
          <Link
            to="/connections"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#667085] hover:text-[#0A0C10]"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            {t("connections.back")}
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center overflow-hidden rounded-[10px] border border-[#E6E8EC] bg-white">
                <img
                  src={shopifyMark}
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 object-contain"
                />
              </span>
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-[#0A0C10]">
                  {t("connections.shopifyStore")}
                </h1>
                <p className="mt-1 text-[13px] text-[#667085]">
                  {t("connections.shopifySubtitle")}
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
              {fullyLinked ? t("connections.connected") : t("connections.notConnected")}
            </span>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-24 w-full rounded-[14px]" />
        ) : (
          <ConnectionStatCards cards={stats} />
        )}

        <StoreConnectPanel
          linked={fullyLinked}
          storeName={storeName ?? oauth?.shopDomain ?? null}
          storeDomain={oauth?.shopDomain ?? storeDomain}
          accessTokenConfigured={oauthLinked || accessTokenConfigured}
          oauthConfigured={Boolean(oauth?.oauthConfigured)}
          oauthShop={oauth?.shopDomain ?? null}
          oauthError={oauthError === "oauth"}
          onOauthInstall={(shop) => {
            void navigate({ to: "/auth/shopify", search: { shop } });
          }}
          onConnect={connect}
          onDisconnect={() => {
            disconnect();
            if (oauthLinked) {
              void disconnectShopifyStore().then(() => oauthQuery.refetch());
            }
          }}
        />

        {fullyLinked ? (
          <ConnectionSyncPanel
            title={t("connections.synchronization")}
            description={t("connections.syncDescription")}
            checks={[
              { label: t("connections.storeLinkedCheck"), ok: fullyLinked },
              {
                label: oauthLinked
                  ? t("connections.authorizedViaShopify")
                  : t("connections.adminTokenConfigured"),
                ok: oauthLinked || accessTokenConfigured,
              },
              {
                label: summary?.lastSyncAt
                  ? t("connections.lastSyncRelative", {
                      relative: formatDropiRelative(summary.lastSyncAt, locale),
                    })
                  : t("connections.waitingFirstSync"),
                ok: Boolean(summary?.lastSyncAt),
              },
              {
                label:
                  summary?.status === "error"
                    ? t("connections.syncHasProblems")
                    : t("connections.noSyncProblems"),
                ok: summary?.status !== "error",
              },
            ]}
            refreshing={syncing || testing || query.isFetching}
            onRefresh={() => void runSync()}
            {...(!oauthLinked
              ? {
                  onTest: () => {
                    void (async () => {
                      const token = getAccessToken();
                      if (!storeDomain || !token) {
                        toast.error(t("connections.connectStoreFirst"));
                        return;
                      }
                      setTesting(true);
                      try {
                        const result = await testShopifyConnection({
                          data: { storeDomain, accessToken: token },
                        });
                        if (!result.ok) {
                          toast.error(result.error ?? t("connections.shopifyRejected"));
                          return;
                        }
                        toast.success(
                          result.shop
                            ? t("connections.shopifyReached", { shop: result.shop })
                            : t("connections.shopifyTokenAccepted"),
                        );
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : t("connections.shopifyTestFailed"),
                        );
                      } finally {
                        setTesting(false);
                      }
                    })();
                  },
                }
              : {})}
            onDisconnect={disconnect}
            refreshLabel={t("connections.syncNow")}
          />
        ) : null}

        <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
          <h2 className="text-[15px] font-semibold text-[#0A0C10]">
            {t("connections.dataImported")}
          </h2>
          <p className="mt-1 text-[13px] text-[#667085]">{t("connections.dataImportedHint")}</p>
          <ul className="mt-3 grid gap-2 text-[13px] text-[#0A0C10] sm:grid-cols-2">
            {[
              "customer_name, phone, email",
              "city, postal_code, address, country",
              "product_summary, total, currency",
              "status_name, tracking_code / url, shipping_company",
              "shopify_order_id (links supply webhooks)",
            ].map((item) => (
              <li
                key={item}
                className="rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2"
              >
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Button
              asChild
              variant="outline"
              className="h-9 rounded-[10px] text-[13px] shadow-none"
            >
              <Link to="/orders" search={{ supply: "shopify" }}>
                {t("connections.openShopifyOrders")}
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

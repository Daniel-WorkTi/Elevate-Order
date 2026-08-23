import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StoreConnectPanel } from "@/components/connections/store/store-connect-panel";
import shopifyMark from "@/assets/shopify-mark.png";
import { useStoreConnectionPreference } from "@/hooks/use-store-connection-preference";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { getShopifyDashboard, syncShopifyOrders } from "@/lib/integrations/shopify/shopify.functions";
import {
  disconnectShopifyStore,
  getShopifyOauthStatus,
  syncConnectedShopifyStore,
} from "@/lib/integrations/shopify/oauth.functions";
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
  const { t } = useI18n();
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
  const { workspaceId } = useWorkspaceId();
  const [syncing, setSyncing] = useState(false);

  const oauth = oauthQuery.data;
  const oauthLinked = Boolean(oauth?.connected && oauth.shopDomain);
  const fullyLinked = oauthLinked || (linked && accessTokenConfigured && Boolean(storeDomain));

  async function runSync() {
    setSyncing(true);
    try {
      if (oauthLinked) {
        const result = await syncConnectedShopifyStore({
          data: workspaceId ? { workspaceId } : {},
        });
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
        data: {
          storeDomain,
          accessToken: token,
          limit: 50,
          ...(workspaceId ? { workspaceId } : {}),
        },
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
    <AppShell title={t("connections.title")}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/connections"
              className="text-[#667085] hover:text-[#0A0C10]"
              aria-label={t("connections.back")}
            >
              <ArrowLeft className="size-4" strokeWidth={1.75} />
            </Link>
            <span className="grid size-9 place-items-center overflow-hidden rounded-[10px] border border-[#E6E8EC] bg-white">
              <img src={shopifyMark} alt="" width={20} height={20} className="size-5 object-contain" />
            </span>
            <h1 className="text-[18px] font-semibold tracking-tight text-[#0A0C10]">Shopify</h1>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
              fullyLinked
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-[#E6E8EC] bg-[#F7F8FA] text-[#667085]",
            )}
          >
            <span
              className={cn("size-1.5 rounded-full", fullyLinked ? "bg-emerald-500" : "bg-[#98A2B3]")}
              aria-hidden
            />
            {fullyLinked ? t("connections.connected") : t("connections.notConnected")}
          </span>
        </div>

        <StoreConnectPanel
          linked={fullyLinked}
          storeName={storeName ?? oauth?.shopDomain ?? null}
          storeDomain={oauth?.shopDomain ?? storeDomain}
          oauthConfigured={Boolean(oauth?.oauthConfigured)}
          oauthShop={oauth?.shopDomain ?? null}
          oauthError={oauthError === "oauth"}
          onOauthInstall={(shop) => {
            void navigate({
              to: "/auth/shopify",
              search: { shop, ...(workspaceId ? { workspaceId } : {}) },
            });
          }}
          onConnect={connect}
          onDisconnect={() => {
            disconnect();
            if (oauthLinked) {
              void disconnectShopifyStore().then(() => oauthQuery.refetch());
            }
          }}
          {...(fullyLinked ? { onSync: () => void runSync() } : {})}
          syncing={syncing}
        />
      </div>
    </AppShell>
  );
}

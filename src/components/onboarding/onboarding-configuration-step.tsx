import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { markOnboardingSkipped } from "@/components/onboarding/onboarding-skip-storage";
import { ShopifyLogo } from "@/components/brands/shopify-logo";
import { DropiSetupPanel } from "@/components/connections/dropi/dropi-setup-panel";
import { DropeaSetupPanel } from "@/components/connections/dropea/dropea-setup-panel";
import { StoreConnectPanel } from "@/components/connections/store/store-connect-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useDropeaConnectionPreference } from "@/hooks/use-dropea-connection-preference";
import { useStoreConnectionPreference } from "@/hooks/use-store-connection-preference";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import {
  isConnectedState,
  mapDropiConnectionState,
  mapDropeaConnectionState,
  mapShopifyConnectionState,
} from "@/lib/connections/connection-domain";
import {
  dropeaStatusClass,
  dropeaStatusLabelKey,
} from "@/lib/integrations/dropea/dropea-format";
import { getDropeaDashboard } from "@/lib/integrations/dropea/dropea.functions";
import { applyOperatorDropeaSummary } from "@/lib/integrations/dropea/dropea-operator-status";
import { syncDropeaOrders } from "@/lib/integrations/dropea/sync-dropea-orders";
import {
  dropiStatusClass,
  dropiStatusDotClass,
  dropiStatusLabelKey,
} from "@/lib/integrations/dropi/dropi-format";
import { getDropiDashboard } from "@/lib/integrations/dropi/dropi.functions";
import { applyOperatorDropiSummary } from "@/lib/integrations/dropi/dropi-operator-status";
import {
  disconnectShopifyStore,
  getShopifyOauthStatus,
  syncConnectedShopifyStore,
} from "@/lib/integrations/shopify/oauth.functions";
import { getWorkspaceWebhookUrl } from "@/lib/integrations/workspace-webhook.functions";
import { useT } from "@/lib/i18n/locale-context";
import { ensureDefaultWorkspace } from "@/lib/workspace/workspace.functions";
import { cn } from "@/lib/utils";

type OnboardingConfigurationStepProps = {
  onContinue: () => void;
  oauthError?: boolean;
};

function publicBaseUrlPayload(): { publicBaseUrl?: string } {
  if (
    typeof window !== "undefined" &&
    /^https:\/\//i.test(window.location.origin) &&
    !/localhost|127\.0\.0\.1/i.test(window.location.origin)
  ) {
    return { publicBaseUrl: window.location.origin };
  }
  return {};
}

/**
 * Step 1 — real Connections panels for Shopify, Dropi Pro, and Dropea.
 * Multiple providers may be connected; none are radio selections.
 */
export function OnboardingConfigurationStep({
  onContinue,
  oauthError = false,
}: OnboardingConfigurationStepProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const { workspaceId, ready, refresh } = useWorkspaceId();
  const [bootstrapping, setBootstrapping] = useState(false);
  const [syncingShopify, setSyncingShopify] = useState(false);
  const [syncingDropea, setSyncingDropea] = useState(false);

  useEffect(() => {
    if (!ready || workspaceId) return;
    let cancelled = false;
    setBootstrapping(true);
    void ensureDefaultWorkspace()
      .then(() => refresh())
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, workspaceId, refresh]);

  const oauthQuery = useQuery({
    queryKey: ["connections", "shopify", "oauth"],
    queryFn: () => getShopifyOauthStatus(),
    placeholderData: keepPreviousData,
  });

  const { linked, storeName, storeDomain, connect, disconnect, busy } =
    useStoreConnectionPreference(workspaceId);

  const {
    linked: dropeaLinked,
    apiTokenConfigured,
    hmacSecretConfigured,
    connect: connectDropea,
    disconnect: disconnectDropea,
    busy: dropeaBusy,
  } = useDropeaConnectionPreference(workspaceId);

  const dropiQuery = useQuery({
    queryKey: ["connections", "dropi", "dashboard", workspaceId],
    queryFn: () => getDropiDashboard({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
    placeholderData: keepPreviousData,
  });

  const dropeaQuery = useQuery({
    queryKey: ["connections", "dropea", "dashboard", workspaceId],
    queryFn: () => getDropeaDashboard({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
    placeholderData: keepPreviousData,
  });

  const dropiWebhook = useQuery({
    queryKey: ["workspace-webhook", "dropi", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      getWorkspaceWebhookUrl({
        data: { workspaceId: workspaceId!, supply: "dropi", ...publicBaseUrlPayload() },
      }),
  });

  const dropeaWebhook = useQuery({
    queryKey: ["workspace-webhook", "dropea", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      getWorkspaceWebhookUrl({
        data: { workspaceId: workspaceId!, supply: "dropea", ...publicBaseUrlPayload() },
      }),
  });

  const oauth = oauthQuery.data;
  const fullyLinked = Boolean(oauth?.connected && oauth.shopDomain) || linked;
  const shopifyState = mapShopifyConnectionState({
    connected: fullyLinked,
    connecting: busy || bootstrapping,
    syncing: syncingShopify,
    error: oauthError,
  });
  const shopifyConnected = isConnectedState(shopifyState);

  const dropiSummary = useMemo(() => {
    if (!dropiQuery.data?.summary) return null;
    return applyOperatorDropiSummary(dropiQuery.data.summary);
  }, [dropiQuery.data?.summary]);

  const dropeaSummary = useMemo(() => {
    if (!dropeaQuery.data?.summary) return null;
    return applyOperatorDropeaSummary(
      dropeaQuery.data.summary,
      dropeaLinked,
      apiTokenConfigured,
      hmacSecretConfigured,
    );
  }, [dropeaQuery.data?.summary, dropeaLinked, apiTokenConfigured, hmacSecretConfigured]);

  const dropiState = dropiSummary
    ? mapDropiConnectionState(dropiSummary.status)
    : "not_connected";
  const dropeaState = dropeaSummary
    ? mapDropeaConnectionState(dropeaSummary.status, { syncing: syncingDropea })
    : "not_connected";

  const dropiConnected = isConnectedState(dropiState);
  const dropeaConnected = isConnectedState(dropeaState);
  const dropiWaiting = dropiState === "awaiting_external_action";
  const anyConnected = shopifyConnected || dropiConnected || dropeaConnected;

  const dropiServerReady = Boolean(
    dropiQuery.data?.summary.serverConfigured && dropiQuery.data?.summary.authConfigured,
  );
  const dropeaServerReady = Boolean(dropeaQuery.data?.summary.serverConfigured);

  const loading =
    bootstrapping ||
    (Boolean(workspaceId) &&
      (dropiQuery.isPending || dropeaQuery.isPending) &&
      !dropiSummary &&
      !oauth);

  async function runShopifySync() {
    setSyncingShopify(true);
    try {
      const result = await syncConnectedShopifyStore({
        data: workspaceId ? { workspaceId } : {},
      });
      await oauthQuery.refetch();
      if (!result.ok) {
        toast.error(result.error ?? t("connections.shopifySyncFailed"));
        return;
      }
      toast.success(
        result.imported === 1
          ? t("connections.importedOrdersOne", { count: result.imported })
          : t("connections.importedOrders", { count: result.imported }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("connections.shopifySyncFailed"));
    } finally {
      setSyncingShopify(false);
    }
  }

  function skip() {
    markOnboardingSkipped("configuration");
    onContinue();
  }

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <OnboardingStepper currentStep="configuration" className="mb-6" />

      <header className="mb-5">
        <h2 className="text-[24px] font-semibold tracking-tight text-foreground md:text-[28px]">
          {t("onboarding.configuration.headline")}
        </h2>
        <p className="mt-2 text-[14px] text-muted-foreground">
          {t("onboarding.configuration.body")}
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-36 w-full rounded-[14px]" />
          <Skeleton className="h-36 w-full rounded-[14px]" />
          <Skeleton className="h-36 w-full rounded-[14px]" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Shopify — same StoreConnectPanel as Connections */}
          <section className="rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center overflow-hidden rounded-[10px] border border-border bg-white">
                  <ShopifyLogo size={28} />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-foreground">Shopify</p>
                  <p className="text-[13px] text-muted-foreground">
                    {t("onboarding.configuration.shopifyHint")}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                  shopifyConnected
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : oauthError
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-border bg-[#F7F8FA] text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    shopifyConnected
                      ? "bg-emerald-500"
                      : oauthError
                        ? "bg-red-500"
                        : "bg-[#98A2B3]",
                  )}
                  aria-hidden
                />
                {shopifyConnected
                  ? t("connections.connected")
                  : oauthError
                    ? t("connections.error")
                    : t("connections.notConnected")}
              </span>
            </div>

            <StoreConnectPanel
              linked={fullyLinked}
              storeName={storeName ?? oauth?.shopDomain ?? null}
              storeDomain={oauth?.shopDomain ?? storeDomain}
              oauthConfigured={Boolean(oauth?.oauthConfigured)}
              oauthShop={oauth?.shopDomain ?? null}
              oauthError={oauthError}
              connecting={busy || bootstrapping}
              onOauthInstall={(shop) => {
                const params = new URLSearchParams({
                  shop,
                  returnTo: "/onboarding?step=configuration",
                });
                if (workspaceId) params.set("workspaceId", workspaceId);
                (window.top ?? window).location.assign(`/auth/shopify?${params.toString()}`);
              }}
              onConnect={connect}
              onDisconnect={async () => {
                await disconnect();
                await disconnectShopifyStore({});
                await queryClient.invalidateQueries({ queryKey: ["connections", "shopify"] });
                await oauthQuery.refetch();
              }}
              {...(fullyLinked ? { onSync: () => void runShopifySync() } : {})}
              syncing={syncingShopify}
            />
          </section>

          {/* Dropi — same DropiSetupPanel as Connections */}
          <section className="rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[15px] font-semibold text-foreground">Dropi Pro</p>
                <p className="text-[13px] text-muted-foreground">
                  {t("onboarding.configuration.dropiHint")}
                </p>
              </div>
              {dropiSummary ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                    dropiStatusClass(dropiSummary.status),
                  )}
                >
                  <span
                    className={cn("size-1.5 rounded-full", dropiStatusDotClass(dropiSummary.status))}
                  />
                  {t(dropiStatusLabelKey(dropiSummary.status))}
                </span>
              ) : null}
            </div>
            {dropiWaiting ? (
              <p className="mb-3 text-[13px] text-amber-800">
                {t("onboarding.configuration.waitingFirstEvent")}
              </p>
            ) : null}
            <DropiSetupPanel
              webhookUrl={dropiWebhook.data?.webhookUrl ?? ""}
              loadingUrl={dropiWebhook.isPending || !workspaceId}
              urlError={dropiWebhook.isError ? t("connections.webhookUrlError") : null}
              serverReady={dropiServerReady}
              status={dropiSummary?.status ?? "not_configured"}
            />
          </section>

          {/* Dropea — same DropeaSetupPanel as Connections */}
          <section className="rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[15px] font-semibold text-foreground">Dropea</p>
                <p className="text-[13px] text-muted-foreground">
                  {t("onboarding.configuration.dropeaHint")}
                </p>
              </div>
              {dropeaSummary ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                    dropeaStatusClass(dropeaSummary.status),
                  )}
                >
                  {t(dropeaStatusLabelKey(dropeaSummary.status))}
                </span>
              ) : null}
            </div>
            <DropeaSetupPanel
              linked={dropeaLinked}
              apiTokenConfigured={apiTokenConfigured}
              hmacSecretConfigured={hmacSecretConfigured}
              serverReady={dropeaServerReady}
              webhookUrl={dropeaWebhook.data?.webhookUrl ?? ""}
              loadingUrl={dropeaWebhook.isPending || !workspaceId}
              urlError={dropeaWebhook.isError ? t("connections.webhookUrlError") : null}
              connecting={dropeaBusy}
              onConnect={connectDropea}
              onDisconnect={disconnectDropea}
              syncing={syncingDropea}
              onSync={() => {
                if (!workspaceId) {
                  toast.error(t("connections.enterBothToConnect"));
                  return;
                }
                setSyncingDropea(true);
                void syncDropeaOrders({ data: { workspaceId } })
                  .then((result) => {
                    if (!result.ok) {
                      toast.error(result.message ?? t("connections.syncFailed"));
                      return;
                    }
                    toast.success(
                      t("connections.syncDropeaSuccess", { count: result.imported }),
                    );
                    void queryClient.invalidateQueries({ queryKey: ["connections", "dropea"] });
                  })
                  .catch(() => toast.error(t("connections.syncFailed")))
                  .finally(() => setSyncingDropea(false));
              }}
            />
          </section>
        </div>
      )}

      <OnboardingNav
        onContinue={onContinue}
        continueLabel={t("onboarding.continue")}
        backLabel={t("onboarding.back")}
      />

      {!anyConnected ? (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={skip}
            className="text-[14px] text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40"
          >
            {t("onboarding.configureLater")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

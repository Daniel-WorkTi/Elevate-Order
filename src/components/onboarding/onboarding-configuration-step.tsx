import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { markOnboardingSkipped } from "@/components/onboarding/onboarding-skip-storage";
import { DropiSetupPanel } from "@/components/connections/dropi/dropi-setup-panel";
import { DropeaSetupPanel } from "@/components/connections/dropea/dropea-setup-panel";
import { StoreConnectPanel } from "@/components/connections/store/store-connect-panel";
import { SupplyMark } from "@/components/supply-logo";
import { Button } from "@/components/ui/button";
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
import { getDropeaDashboard } from "@/lib/integrations/dropea/dropea.functions";
import { applyOperatorDropeaSummary } from "@/lib/integrations/dropea/dropea-operator-status";
import { getDropiDashboard } from "@/lib/integrations/dropi/dropi.functions";
import { applyOperatorDropiSummary } from "@/lib/integrations/dropi/dropi-operator-status";
import {
  disconnectShopifyStore,
  getShopifyOauthStatus,
} from "@/lib/integrations/shopify/oauth.functions";
import { getWorkspaceWebhookUrl } from "@/lib/integrations/workspace-webhook.functions";
import { useT } from "@/lib/i18n/locale-context";
import { ensureDefaultWorkspace } from "@/lib/workspace/workspace.functions";
import { cn } from "@/lib/utils";

type ProviderId = "shopify" | "dropi" | "dropea";

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
 * Step 1 — choose one order source (3-up cards), then configure that provider only.
 * Backend connection rules unchanged; one valid source unlocks Continue → WhatsApp.
 */
export function OnboardingConfigurationStep({
  onContinue,
  oauthError = false,
}: OnboardingConfigurationStepProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const { workspaceId, ready, refresh } = useWorkspaceId();
  const [bootstrapping, setBootstrapping] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(
    oauthError ? "shopify" : null,
  );

  useEffect(() => {
    if (oauthError) setActiveProvider("shopify");
  }, [oauthError]);

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
    enabled: Boolean(workspaceId) && activeProvider === "dropi",
    queryFn: () =>
      getWorkspaceWebhookUrl({
        data: { workspaceId: workspaceId!, supply: "dropi", ...publicBaseUrlPayload() },
      }),
  });

  const oauth = oauthQuery.data;
  const fullyLinked = Boolean(oauth?.connected && oauth.shopDomain) || linked;
  const shopifyState = mapShopifyConnectionState({
    connected: fullyLinked,
    connecting: busy || bootstrapping,
    syncing: false,
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
    ? mapDropeaConnectionState(dropeaSummary.status)
    : "not_connected";

  const dropiConnected = isConnectedState(dropiState);
  const dropeaConnected = isConnectedState(dropeaState);
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

  function skip() {
    markOnboardingSkipped("configuration");
    onContinue();
  }

  const providers: Array<{
    id: ProviderId;
    supply: "shopify" | "dropi" | "dropea";
    name: string;
    description: string;
    connected: boolean;
  }> = [
    {
      id: "shopify",
      supply: "shopify",
      name: "Shopify",
      description: t("onboarding.configuration.card.shopify"),
      connected: shopifyConnected,
    },
    {
      id: "dropi",
      supply: "dropi",
      name: "Dropi Pro",
      description: t("onboarding.configuration.card.dropi"),
      connected: dropiConnected,
    },
    {
      id: "dropea",
      supply: "dropea",
      name: "Dropea",
      description: t("onboarding.configuration.card.dropea"),
      connected: dropeaConnected,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <OnboardingStepper currentStep="configuration" className="mb-6" />

      {activeProvider === null ? (
        <>
          <header className="mb-8 text-center">
            <h2 className="text-[24px] font-semibold tracking-tight text-foreground md:text-[28px]">
              {t("onboarding.configuration.headline")}
            </h2>
            <p className="mt-2 text-[16px] font-medium text-foreground">
              {t("onboarding.configuration.question")}
            </p>
            <p className="mt-1.5 text-[14px] text-muted-foreground">
              {t("onboarding.configuration.chooserHint")}
            </p>
          </header>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-52 w-full rounded-[14px]" />
              <Skeleton className="h-52 w-full rounded-[14px]" />
              <Skeleton className="h-52 w-full rounded-[14px]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => setActiveProvider(provider.id)}
                  className={cn(
                    "flex h-full min-h-[220px] flex-col items-center rounded-[14px] border border-border bg-card p-6 text-center shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-150",
                    "hover:border-[color:var(--elevate-blue)]/40 hover:shadow-[0_1px_2px_rgb(10_12_16/0.06)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40",
                  )}
                >
                  <SupplyMark supply={provider.supply} size={48} className="rounded-[12px]" />
                  <p className="mt-4 text-[16px] font-semibold tracking-tight text-foreground">
                    {provider.name}
                  </p>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                    {provider.description}
                  </p>
                  {provider.connected ? (
                    <span className="mt-4 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-800">
                      {t("connections.connected")}
                    </span>
                  ) : (
                    <span className="mt-4 inline-flex h-10 items-center justify-center rounded-[10px] bg-[color:var(--elevate-blue)] px-5 text-[14px] font-medium text-white">
                      {t("onboarding.connect")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            {t("onboarding.configuration.addLater")}
          </p>

          {anyConnected ? (
            <OnboardingNav
              onContinue={onContinue}
              continueLabel={t("onboarding.configuration.continueWhatsApp")}
              backLabel={t("onboarding.back")}
            />
          ) : (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={skip}
                className="text-[14px] text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40"
              >
                {t("onboarding.configureLater")}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mx-auto w-full max-w-[680px]">
          <div className="mb-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveProvider(null)}
              className="h-9 rounded-[10px] px-2 text-[14px] text-muted-foreground hover:text-foreground"
            >
              ← {t("onboarding.back")}
            </Button>
          </div>

          <header className="mb-5">
            <h2 className="text-[22px] font-semibold tracking-tight text-foreground md:text-[24px]">
              {activeProvider === "shopify"
                ? t("onboarding.setup.shopify.title")
                : activeProvider === "dropi"
                  ? t("onboarding.setup.dropi.title")
                  : t("onboarding.setup.dropea.title")}
            </h2>
            <p className="mt-1.5 text-[14px] text-muted-foreground">
              {activeProvider === "shopify"
                ? t("onboarding.setup.shopify.body")
                : activeProvider === "dropi"
                  ? t("onboarding.setup.dropi.body")
                  : t("onboarding.setup.dropea.body")}
            </p>
          </header>

          {activeProvider === "shopify" ? (
            <StoreConnectPanel
              variant="onboarding"
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
            />
          ) : null}

          {activeProvider === "dropi" ? (
            <DropiSetupPanel
              variant="onboarding"
              webhookUrl={dropiWebhook.data?.webhookUrl ?? ""}
              loadingUrl={dropiWebhook.isPending || !workspaceId}
              urlError={dropiWebhook.isError ? t("connections.webhookUrlError") : null}
              serverReady={dropiServerReady}
              status={dropiSummary?.status ?? "not_configured"}
            />
          ) : null}

          {activeProvider === "dropea" ? (
            <DropeaSetupPanel
              variant="onboarding"
              linked={dropeaLinked}
              apiTokenConfigured={apiTokenConfigured}
              hmacSecretConfigured={hmacSecretConfigured}
              serverReady={dropeaServerReady}
              webhookUrl=""
              loadingUrl={false}
              onConnect={connectDropea}
              onDisconnect={disconnectDropea}
              connecting={dropeaBusy}
            />
          ) : null}

          {((activeProvider === "shopify" && shopifyConnected) ||
            (activeProvider === "dropi" && dropiConnected) ||
            (activeProvider === "dropea" && dropeaConnected)) && (
            <div className="mt-6 space-y-3">
              <Button
                type="button"
                onClick={onContinue}
                className="h-11 w-full rounded-[10px] bg-[color:var(--elevate-blue)] text-[14px] text-white shadow-none hover:bg-[color:var(--elevate-blue-hover)]"
              >
                {t("onboarding.configuration.continueWhatsApp")}
              </Button>
              <button
                type="button"
                onClick={() => setActiveProvider(null)}
                className="mx-auto block text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("onboarding.configuration.addAnother")}
              </button>
            </div>
          )}

          {!shopifyConnected && !dropiConnected && !dropeaConnected ? (
            <div className="mt-6 text-center">
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
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { readOnboardingSkips } from "@/components/onboarding/onboarding-skip-storage";
import { useDropeaConnectionPreference } from "@/hooks/use-dropea-connection-preference";
import { useStoreConnectionPreference } from "@/hooks/use-store-connection-preference";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import {
  buildConnectionSummary,
  isConnectedState,
  mapDropiConnectionState,
  mapDropeaConnectionState,
  mapShopifyConnectionState,
  mapWhatsAppConnectionState,
  readyRowKind,
  type ConnectionSummary,
} from "@/lib/connections/connection-domain";
import { getDropeaDashboard } from "@/lib/integrations/dropea/dropea.functions";
import { applyOperatorDropeaSummary } from "@/lib/integrations/dropea/dropea-operator-status";
import { getDropiDashboard } from "@/lib/integrations/dropi/dropi.functions";
import { applyOperatorDropiSummary } from "@/lib/integrations/dropi/dropi-operator-status";
import { getShopifyOauthStatus } from "@/lib/integrations/shopify/oauth.functions";
import { getWhatsAppConnectionStatus } from "@/lib/integrations/whatsapp/whatsapp.functions";
import { finishOnboardingClient } from "@/lib/onboarding/onboarding.functions";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

type OnboardingReadyStepProps = {
  userId: string | null;
  onBack: () => void;
};

function StatusCell({ summary }: { summary: ConnectionSummary }) {
  const t = useT();
  const kind = readyRowKind(summary.state, summary.skipped);

  if (kind === "connected") {
    return (
      <span className="text-[13px] font-semibold text-emerald-800">
        {t("connections.connected")}
        {summary.externalIdentifier ? (
          <span className="ml-2 font-mono font-normal text-foreground">{summary.externalIdentifier}</span>
        ) : null}
      </span>
    );
  }
  if (kind === "error") {
    return <span className="text-[13px] font-semibold text-red-800">{t("connections.error")}</span>;
  }
  if (kind === "skipped") {
    return (
      <span className="text-[13px] text-muted-foreground">{t("onboarding.ready.setupLater")}</span>
    );
  }
  if (summary.state === "awaiting_external_action") {
    return (
      <span className="text-[13px] font-medium text-amber-800">
        {t("onboarding.configuration.waitingFirstEvent")}
      </span>
    );
  }
  return (
    <span className="text-[13px] text-muted-foreground">{t("connections.notConfigured")}</span>
  );
}

export function OnboardingReadyStep({ userId, onBack }: OnboardingReadyStepProps) {
  const t = useT();
  const navigate = useNavigate();
  const { workspaceId } = useWorkspaceId();
  const [finishing, setFinishing] = useState(false);
  const skips = readOnboardingSkips();

  const { linked: storeLinked } = useStoreConnectionPreference(workspaceId);
  const {
    linked: dropeaLinked,
    apiTokenConfigured,
    hmacSecretConfigured,
  } = useDropeaConnectionPreference(workspaceId);

  const shopifyQuery = useQuery({
    queryKey: ["connections", "shopify", "oauth", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      getShopifyOauthStatus({
        data: { workspaceId },
      }),
  });

  const dropiQuery = useQuery({
    queryKey: ["connections", "dropi", "dashboard", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => getDropiDashboard({ data: { workspaceId: workspaceId! } }),
  });

  const dropeaQuery = useQuery({
    queryKey: ["connections", "dropea", "dashboard", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => getDropeaDashboard({ data: { workspaceId: workspaceId! } }),
  });

  const waQuery = useQuery({
    queryKey: ["whatsapp", "connection", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => getWhatsAppConnectionStatus({ data: { workspaceId: workspaceId! } }),
  });

  const rows = useMemo(() => {
    const shopifyConnected =
      Boolean(shopifyQuery.data?.connected && shopifyQuery.data.shopDomain) || storeLinked;
    const shopify = buildConnectionSummary({
      provider: "shopify",
      state: mapShopifyConnectionState({ connected: shopifyConnected }),
      displayName: "Shopify",
      externalIdentifier: shopifyQuery.data?.shopDomain ?? null,
      skipped: skips.configuration && !shopifyConnected,
    });

    const dropiApplied = dropiQuery.data?.summary
      ? applyOperatorDropiSummary(dropiQuery.data.summary)
      : null;
    const dropi = buildConnectionSummary({
      provider: "dropi",
      state: dropiApplied
        ? mapDropiConnectionState(dropiApplied.status)
        : "not_connected",
      displayName: "Dropi Pro",
      skipped:
        skips.configuration &&
        !(dropiApplied && isConnectedState(mapDropiConnectionState(dropiApplied.status))),
    });

    const dropeaApplied = dropeaQuery.data?.summary
      ? applyOperatorDropeaSummary(
          dropeaQuery.data.summary,
          dropeaLinked,
          apiTokenConfigured,
          hmacSecretConfigured,
        )
      : null;
    const dropea = buildConnectionSummary({
      provider: "dropea",
      state: dropeaApplied
        ? mapDropeaConnectionState(dropeaApplied.status)
        : "not_connected",
      displayName: "Dropea",
      skipped:
        skips.configuration &&
        !(dropeaApplied && isConnectedState(mapDropeaConnectionState(dropeaApplied.status))),
    });

    const waStatus = waQuery.data?.status;
    const waState = mapWhatsAppConnectionState(waStatus);
    const whatsapp = buildConnectionSummary({
      provider: "whatsapp",
      state: waState,
      displayName: "WhatsApp",
      externalIdentifier: isConnectedState(waState)
        ? waQuery.data?.displayPhoneNumber ?? null
        : null,
      skipped: skips.whatsapp && !isConnectedState(waState),
    });

    return { shopify, dropi, dropea, whatsapp };
  }, [
    shopifyQuery.data,
    storeLinked,
    dropiQuery.data,
    dropeaQuery.data,
    dropeaLinked,
    apiTokenConfigured,
    hmacSecretConfigured,
    waQuery.data,
    skips.configuration,
    skips.whatsapp,
  ]);

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    await finishOnboardingClient(userId);
    void navigate({ to: "/", replace: true });
  }

  return (
    <div className="mx-auto w-full max-w-[840px]">
      <OnboardingStepper currentStep="ready" className="mb-6" />

      <div className="rounded-[14px] border border-border bg-card px-5 py-6 shadow-[var(--shadow-card)] sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[color:var(--elevate-blue-soft)] text-[color:var(--elevate-blue)]">
            <CheckCircle2 className="size-5" strokeWidth={1.5} />
          </span>
          <div>
            <h2 className="text-[24px] font-semibold tracking-tight text-foreground">
              {t("onboarding.ready.headline")}
            </h2>
            <p className="mt-1 text-[14px] text-muted-foreground">{t("onboarding.ready.body")}</p>
          </div>
        </div>

        <dl className="mt-6 divide-y divide-border rounded-[12px] border border-border">
          {(
            [
              { label: t("onboarding.ready.row.shopify"), summary: rows.shopify },
              { label: t("onboarding.ready.row.dropi"), summary: rows.dropi },
              { label: t("onboarding.ready.row.dropea"), summary: rows.dropea },
              { label: t("onboarding.ready.row.whatsapp"), summary: rows.whatsapp },
            ] as const
          ).map((row) => (
            <div
              key={row.summary.provider}
              className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3"
            >
              <dt className="text-[13px] font-medium text-muted-foreground">{row.label}</dt>
              <dd className={cn("text-right")}>
                <StatusCell summary={row.summary} />
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-[13px] text-muted-foreground">{t("onboarding.ready.hint")}</p>
      </div>

      <OnboardingNav
        onBack={onBack}
        onContinue={() => {
          void finish();
        }}
        backLabel={t("onboarding.back")}
        continueLabel={finishing ? t("onboarding.finishing") : t("onboarding.finish")}
        continueDisabled={finishing}
      />
    </div>
  );
}

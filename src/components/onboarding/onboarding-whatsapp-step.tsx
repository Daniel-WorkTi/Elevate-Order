import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { markOnboardingSkipped } from "@/components/onboarding/onboarding-skip-storage";
import { WhatsAppConnectPanel } from "@/components/connections/whatsapp/whatsapp-connect-panel";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import {
  isConnectedState,
  mapWhatsAppConnectionState,
} from "@/lib/connections/connection-domain";
import { getWhatsAppConnectionStatus } from "@/lib/integrations/whatsapp/whatsapp.functions";
import { useT } from "@/lib/i18n/locale-context";
import { ensureDefaultWorkspace } from "@/lib/workspace/workspace.functions";
import { cn } from "@/lib/utils";

type OnboardingWhatsappStepProps = {
  onBack: () => void;
  onContinue: () => void;
};

export function OnboardingWhatsappStep({ onBack, onContinue }: OnboardingWhatsappStepProps) {
  const t = useT();
  const { workspaceId, ready, refresh } = useWorkspaceId();
  const [bootstrappingWorkspace, setBootstrappingWorkspace] = useState(false);

  useEffect(() => {
    if (!ready || workspaceId) return;
    let cancelled = false;
    setBootstrappingWorkspace(true);
    void ensureDefaultWorkspace()
      .then(() => refresh())
      .finally(() => {
        if (!cancelled) setBootstrappingWorkspace(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, workspaceId, refresh]);

  const statusQuery = useQuery({
    queryKey: ["whatsapp", "connection", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => getWhatsAppConnectionStatus({ data: { workspaceId: workspaceId! } }),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (status === "connected" || status === "disconnected" || status === "error") return false;
      return 4000;
    },
  });

  const mapped = mapWhatsAppConnectionState(statusQuery.data?.status);
  const linked = isConnectedState(mapped);
  const phone = statusQuery.data?.displayPhoneNumber?.trim() || null;

  function skip() {
    markOnboardingSkipped("whatsapp");
    onContinue();
  }

  return (
    <div className="mx-auto w-full max-w-[840px]">
      <OnboardingStepper currentStep="whatsapp" className="mb-6" />

      <header className="mb-5">
        <h2 className="text-[24px] font-semibold tracking-tight text-foreground md:text-[28px]">
          {t("onboarding.whatsapp.headline")}
        </h2>
        <p className="mt-2 text-[14px] text-muted-foreground">{t("onboarding.whatsapp.body")}</p>
      </header>

      <section className="rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[15px] font-semibold text-foreground">WhatsApp</p>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
              linked
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : mapped === "reconnecting" || mapped === "connecting"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : mapped === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-border bg-[#F7F8FA] text-muted-foreground",
            )}
          >
            {linked
              ? t("connections.connected")
              : mapped === "reconnecting"
                ? t("connections.reconnecting")
                : mapped === "connecting"
                  ? t("connections.connecting")
                  : mapped === "error"
                    ? t("connections.error")
                    : t("connections.notConnected")}
          </span>
        </div>

        {linked && phone ? (
          <p className="mb-3 font-mono text-[13px] text-foreground">{phone}</p>
        ) : null}

        <WhatsAppConnectPanel
          workspaceId={workspaceId}
          workspaceReady={ready && !bootstrappingWorkspace}
          compact
        />
      </section>

      <OnboardingNav
        onBack={onBack}
        {...(linked ? { onContinue } : {})}
        backLabel={t("onboarding.back")}
        continueLabel={t("onboarding.continue")}
      />

      {!linked ? (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={skip}
            className="text-[14px] text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40"
          >
            {t("onboarding.whatsapp.skip")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

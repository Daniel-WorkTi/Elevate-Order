import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { WhatsAppConnectPanel } from "@/components/connections/whatsapp/whatsapp-connect-panel";
import { Switch } from "@/components/ui/switch";
import { useWhatsAppSettings } from "@/hooks/use-whatsapp-settings";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { getWhatsAppConnectionStatus } from "@/lib/integrations/whatsapp/whatsapp.functions";
import { useT } from "@/lib/i18n/locale-context";
import { ensureDefaultWorkspace } from "@/lib/workspace/workspace.functions";

type OnboardingWhatsappStepProps = {
  onBack: () => void;
  onContinue: () => void;
};

export function OnboardingWhatsappStep({ onBack, onContinue }: OnboardingWhatsappStepProps) {
  const t = useT();
  const { workspaceId, ready, refresh } = useWorkspaceId();
  const { settings, save } = useWhatsAppSettings();
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
  });

  const linked = statusQuery.data?.status === "connected";

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <OnboardingStepper currentStep="whatsapp" className="mb-10 md:mb-12" />

      <header className="text-center">
        <h2 className="text-[28px] font-semibold tracking-tight text-foreground md:text-[32px]">
          {t("onboarding.whatsapp.headline")}
        </h2>
        <p className="mt-3 text-[15px] text-muted-foreground md:text-[16px]">
          {t("onboarding.whatsapp.bodyEmbedded")}
        </p>
      </header>

      <div className="mt-8 space-y-4 rounded-[16px] border border-border bg-card p-5 sm:p-6">
        <WhatsAppConnectPanel
          workspaceId={workspaceId}
          workspaceReady={ready && !bootstrappingWorkspace}
          compact
        />

        <div className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-[#F7F8FA] px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-foreground">
              {t("onboarding.whatsapp.confirmToggle")}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {t("onboarding.whatsapp.confirmToggleHint")}
            </p>
          </div>
          <Switch
            checked={settings.autoMessage}
            onCheckedChange={(checked) => save({ ...settings, autoMessage: checked })}
            aria-label={t("onboarding.whatsapp.confirmToggle")}
          />
        </div>
      </div>

      <OnboardingNav
        onBack={onBack}
        {...(linked ? { onContinue } : {})}
        backLabel={t("onboarding.back")}
        continueLabel={t("onboarding.continue")}
      />

      {!linked ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onContinue}
            className="text-[14px] text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40"
          >
            {t("onboarding.whatsapp.skip")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import type { IntegrationId } from "@/components/onboarding/types";
import { finishOnboardingClient } from "@/lib/onboarding/onboarding.functions";
import { useT } from "@/lib/i18n/locale-context";

type OnboardingReadyStepProps = {
  userId: string | null;
  selectedId: IntegrationId | null;
  onBack: () => void;
};

export function OnboardingReadyStep({ userId, selectedId, onBack }: OnboardingReadyStepProps) {
  const t = useT();
  const navigate = useNavigate();
  const [finishing, setFinishing] = useState(false);

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    await finishOnboardingClient(userId);
    void navigate({ to: "/", replace: true });
  }

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <OnboardingStepper currentStep="ready" className="mb-10 md:mb-12" />

      <div className="rounded-[16px] border border-border bg-card px-6 py-10 text-center sm:px-10">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-[color:var(--elevate-blue-soft)] text-[color:var(--elevate-blue)]">
          <CheckCircle2 className="size-7" strokeWidth={1.5} />
        </span>

        <h2 className="mt-5 text-[28px] font-semibold tracking-tight text-foreground md:text-[32px]">
          {t("onboarding.ready.headline")}
        </h2>
        <p className="mt-3 text-[15px] text-muted-foreground md:text-[16px]">
          {t("onboarding.ready.body")}
        </p>
        {selectedId ? (
          <p className="mt-3 text-[14px] font-medium text-foreground">
            {t("onboarding.ready.selected", {
              name: t(`onboarding.integration.name.${selectedId}`),
            })}
          </p>
        ) : (
          <p className="mt-3 text-[14px] text-muted-foreground">{t("onboarding.ready.noStore")}</p>
        )}
        <p className="mt-2 text-[13px] text-muted-foreground">{t("onboarding.ready.hint")}</p>
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

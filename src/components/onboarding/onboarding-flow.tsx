import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { OnboardingConfigurationStep } from "@/components/onboarding/onboarding-configuration-step";
import { OnboardingReadyStep } from "@/components/onboarding/onboarding-ready-step";
import { OnboardingWhatsappStep } from "@/components/onboarding/onboarding-whatsapp-step";
import {
  persistOnboardingStep,
  resolveOnboardingInitialStep,
} from "@/components/onboarding/onboarding-step-storage";
import {
  ONBOARDING_STEP_ORDER,
  type OnboardingStepId,
} from "@/components/onboarding/types";

type OnboardingFlowProps = {
  userId: string | null;
  initialStep?: string;
  oauthError?: boolean;
};

export function OnboardingFlow({ userId, initialStep, oauthError = false }: OnboardingFlowProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStepId>(() =>
    resolveOnboardingInitialStep(initialStep),
  );

  useEffect(() => {
    persistOnboardingStep(step);
    void navigate({
      to: "/onboarding",
      search: {
        step,
        ...(oauthError && step === "configuration" ? { error: "oauth" as const } : {}),
      },
      replace: true,
    });
  }, [navigate, step, oauthError]);

  const goNext = useCallback(() => {
    const idx = ONBOARDING_STEP_ORDER.indexOf(step);
    const next = ONBOARDING_STEP_ORDER[idx + 1];
    if (next) setStep(next);
  }, [step]);

  const goBack = useCallback(() => {
    const idx = ONBOARDING_STEP_ORDER.indexOf(step);
    const prev = ONBOARDING_STEP_ORDER[idx - 1];
    if (prev) setStep(prev);
  }, [step]);

  if (step === "configuration") {
    return <OnboardingConfigurationStep onContinue={goNext} oauthError={oauthError} />;
  }

  if (step === "whatsapp") {
    return <OnboardingWhatsappStep onBack={goBack} onContinue={goNext} />;
  }

  return <OnboardingReadyStep userId={userId} onBack={goBack} />;
}

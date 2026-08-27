import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { OnboardingOrdersStep } from "@/components/onboarding/onboarding-orders-step";
import { OnboardingReadyStep } from "@/components/onboarding/onboarding-ready-step";
import { OnboardingStoreStep } from "@/components/onboarding/onboarding-store-step";
import { OnboardingWhatsappStep } from "@/components/onboarding/onboarding-whatsapp-step";
import {
  isOnboardingStep,
  persistOnboardingStep,
  resolveOnboardingInitialStep,
} from "@/components/onboarding/onboarding-step-storage";
import type { IntegrationId, OnboardingStepId } from "@/components/onboarding/types";

const STEP_ORDER: readonly OnboardingStepId[] = ["store", "orders", "whatsapp", "ready"];

type OnboardingFlowProps = {
  userId: string | null;
  initialStep?: OnboardingStepId;
};

export function OnboardingFlow({ userId, initialStep }: OnboardingFlowProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStepId>(() => resolveOnboardingInitialStep(initialStep));
  const [selectedId, setSelectedId] = useState<IntegrationId | null>(null);

  useEffect(() => {
    persistOnboardingStep(step);
    void navigate({
      to: "/onboarding",
      search: { step },
      replace: true,
    });
  }, [navigate, step]);

  const goTo = useCallback((next: OnboardingStepId) => {
    if (!isOnboardingStep(next)) return;
    setStep(next);
  }, []);

  const goNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    const next = STEP_ORDER[idx + 1];
    if (next) setStep(next);
  }, [step]);

  const goBack = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    const prev = STEP_ORDER[idx - 1];
    if (prev) setStep(prev);
  }, [step]);

  function selectStore(id: IntegrationId) {
    setSelectedId(id);
    goTo("orders");
  }

  if (step === "store") {
    return (
      <OnboardingStoreStep
        selectedId={selectedId}
        onSelect={selectStore}
        onContinueWithout={goNext}
      />
    );
  }

  if (step === "orders") {
    return (
      <OnboardingOrdersStep
        selectedId={selectedId}
        onBack={goBack}
        onContinue={goNext}
      />
    );
  }

  if (step === "whatsapp") {
    return <OnboardingWhatsappStep onBack={goBack} onContinue={goNext} />;
  }

  return (
    <OnboardingReadyStep userId={userId} selectedId={selectedId} onBack={goBack} />
  );
}

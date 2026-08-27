import { useCallback, useState } from "react";

import { OnboardingOrdersStep } from "@/components/onboarding/onboarding-orders-step";
import { OnboardingReadyStep } from "@/components/onboarding/onboarding-ready-step";
import { OnboardingStoreStep } from "@/components/onboarding/onboarding-store-step";
import { OnboardingWhatsappStep } from "@/components/onboarding/onboarding-whatsapp-step";
import type { IntegrationId, OnboardingStepId } from "@/components/onboarding/types";

const STEP_ORDER: readonly OnboardingStepId[] = ["store", "orders", "whatsapp", "ready"];

type OnboardingFlowProps = {
  userId: string | null;
};

export function OnboardingFlow({ userId }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStepId>("store");
  const [selectedId, setSelectedId] = useState<IntegrationId | null>(null);

  const goTo = useCallback((next: OnboardingStepId) => {
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

import type { OnboardingStepId } from "@/components/onboarding/types";

const STORAGE_KEY = "elevate-onboarding-step";

const STEP_ORDER: readonly OnboardingStepId[] = ["store", "orders", "whatsapp", "ready"];

export function isOnboardingStep(value: string | undefined): value is OnboardingStepId {
  return STEP_ORDER.includes(value as OnboardingStepId);
}

export function readPersistedOnboardingStep(): OnboardingStepId | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (saved !== null && isOnboardingStep(saved)) return saved;
    return null;
  } catch {
    return null;
  }
}

export function persistOnboardingStep(step: OnboardingStepId) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, step);
  } catch {
    // ignore
  }
}

export function resolveOnboardingInitialStep(
  urlStep: OnboardingStepId | undefined,
): OnboardingStepId {
  if (urlStep && isOnboardingStep(urlStep)) return urlStep;
  return readPersistedOnboardingStep() ?? "store";
}

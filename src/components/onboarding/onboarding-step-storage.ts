import type { OnboardingStepId } from "@/components/onboarding/types";
import {
  normalizeOnboardingStepId,
  ONBOARDING_STEP_ORDER,
} from "@/components/onboarding/types";

const STORAGE_KEY = "elevate-onboarding-step";

export function isOnboardingStep(value: string | undefined): value is OnboardingStepId {
  const normalized = normalizeOnboardingStepId(value);
  return normalized !== null && (ONBOARDING_STEP_ORDER as readonly string[]).includes(normalized);
}

export function readPersistedOnboardingStep(): OnboardingStepId | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    return normalizeOnboardingStepId(saved ?? undefined);
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
  urlStep: string | undefined,
): OnboardingStepId {
  const fromUrl = normalizeOnboardingStepId(urlStep);
  if (fromUrl) return fromUrl;
  return readPersistedOnboardingStep() ?? "configuration";
}

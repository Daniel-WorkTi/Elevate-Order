import type { ComponentType } from "react";

export type IntegrationId = "shopify" | "dropi" | "dropea";

export type IntegrationStatus = "available" | "coming-soon";

export type IntegrationOption = {
  id: IntegrationId;
  name: string;
  description: string;
  connectTo: "/connections" | "/connections/shopify" | "/connections/dropi" | "/connections/dropea";
  search: { source: IntegrationId };
  accentClass: string;
  Icon: ComponentType<{ className?: string }>;
  status: IntegrationStatus;
};

/** Canonical onboarding steps (3). Legacy `store` / `orders` map to `configuration`. */
export type OnboardingStepId = "configuration" | "whatsapp" | "ready";

export type LegacyOnboardingStepId = "store" | "orders";

export type OnboardingStep = {
  id: OnboardingStepId;
  label: string;
  number: number;
};

export const ONBOARDING_STEP_ORDER: readonly OnboardingStepId[] = [
  "configuration",
  "whatsapp",
  "ready",
] as const;

/** Map old URLs (?step=store|orders) and aliases onto the 3-step model. */
export function normalizeOnboardingStepId(
  value: string | undefined | null,
): OnboardingStepId | null {
  if (!value) return null;
  if (value === "store" || value === "orders" || value === "configuration") {
    return "configuration";
  }
  if (value === "whatsapp" || value === "ready") return value;
  return null;
}

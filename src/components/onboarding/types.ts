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

export type OnboardingStepId = "store" | "orders" | "whatsapp" | "ready";

export type OnboardingStep = {
  id: OnboardingStepId;
  label: string;
  number: number;
};

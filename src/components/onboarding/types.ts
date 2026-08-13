import type { LucideIcon } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export type IntegrationId = "shopify" | "dropi" | "dropea";

export type IntegrationStatus = "available" | "coming-soon";

export type IntegrationOption = {
  id: IntegrationId;
  name: string;
  description: string;
  /** Query param for /connections */
  connectTo: "/connections";
  search: { source: IntegrationId };
  accentClass: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>> | LucideIcon;
  status: IntegrationStatus;
};

export type OnboardingStepId = "store" | "orders" | "whatsapp" | "ready";

export type OnboardingStep = {
  id: OnboardingStepId;
  label: string;
  number: number;
};

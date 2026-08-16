import { DropeaMark, DropiMark, ShopifyMark } from "@/components/onboarding/brand-icons";
import type { IntegrationOption, OnboardingStep } from "@/components/onboarding/types";

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  { id: "store", label: "Store", number: 1 },
  { id: "orders", label: "Orders", number: 2 },
  { id: "whatsapp", label: "WhatsApp", number: 3 },
  { id: "ready", label: "Ready", number: 4 },
] as const;

export const INTEGRATION_OPTIONS: readonly IntegrationOption[] = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Connect your Shopify store and import orders.",
    connectTo: "/connections/shopify",
    search: { source: "shopify" },
    accentClass: "bg-[#F3F8EC]",
    Icon: ShopifyMark,
    status: "available",
  },
  {
    id: "dropi",
    name: "Dropi Pro",
    description: "Sync orders from your Dropi Pro account.",
    connectTo: "/connections/dropi",
    search: { source: "dropi" },
    accentClass: "overflow-hidden bg-white",
    Icon: DropiMark,
    status: "available",
  },
  {
    id: "dropea",
    name: "Dropea",
    description: "Connect your Dropea account via API.",
    connectTo: "/connections/dropea",
    search: { source: "dropea" },
    accentClass: "overflow-hidden bg-black",
    Icon: DropeaMark,
    status: "available",
  },
] as const;

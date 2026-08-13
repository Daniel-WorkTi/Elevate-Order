import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { OnboardingStoreStep } from "@/components/onboarding/onboarding-store-step";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — ELEVATE" },
      {
        name: "description",
        content: "Connect your first store to import orders into ELEVATE Orders.",
      },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  return (
    <AppShell title="Onboarding" subtitle="Connect your first store">
      <OnboardingStoreStep />
    </AppShell>
  );
}

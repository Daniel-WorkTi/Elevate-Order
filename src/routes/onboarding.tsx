import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { OnboardingStoreStep } from "@/components/onboarding/onboarding-store-step";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: metaT("meta.onboardingTitle") },
      { name: "description", content: metaT("meta.onboardingDescription") },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const t = useT();
  return (
    <AppShell title={t("onboarding.title")} subtitle={t("onboarding.subtitle")}>
      <OnboardingStoreStep />
    </AppShell>
  );
}

import { createFileRoute, useRouteContext } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
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
  const { user } = useRouteContext({ from: "__root__" });

  return (
    <AppShell title={t("onboarding.title")} subtitle={t("onboarding.subtitle")}>
      <OnboardingFlow userId={user?.id ?? null} />
    </AppShell>
  );
}

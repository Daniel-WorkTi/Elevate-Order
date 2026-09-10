import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";

const onboardingSearchSchema = z.object({
  step: z.enum(["store", "orders", "whatsapp", "ready"]).optional(),
});

export const Route = createFileRoute("/onboarding")({
  validateSearch: (search) => onboardingSearchSchema.parse(search),
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
  const { step } = Route.useSearch();

  return (
    <AppShell title={t("onboarding.title")} subtitle={t("onboarding.subtitle")}>
      <OnboardingFlow
        userId={user?.id ?? null}
        {...(step ? { initialStep: step } : {})}
      />
    </AppShell>
  );
}

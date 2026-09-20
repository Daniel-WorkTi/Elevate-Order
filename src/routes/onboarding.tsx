import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { normalizeOnboardingStepId } from "@/components/onboarding/types";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";

const onboardingSearchSchema = z.object({
  // Accept legacy store|orders → normalized in flow to configuration
  step: z
    .enum(["configuration", "whatsapp", "ready", "store", "orders"])
    .optional(),
  error: z.enum(["oauth"]).optional(),
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
  const { step, error } = Route.useSearch();
  const normalized = normalizeOnboardingStepId(step) ?? undefined;

  return (
    <AppShell title={t("onboarding.title")} subtitle={t("onboarding.subtitle")}>
      <OnboardingFlow
        userId={user?.id ?? null}
        oauthError={error === "oauth"}
        {...(normalized ? { initialStep: normalized } : {})}
      />
    </AppShell>
  );
}

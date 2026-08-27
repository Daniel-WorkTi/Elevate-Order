import { INTEGRATION_OPTIONS } from "@/components/onboarding/integrations";
import { IntegrationCard } from "@/components/onboarding/integration-card";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import type { IntegrationId } from "@/components/onboarding/types";
import { useT } from "@/lib/i18n/locale-context";

type OnboardingStoreStepProps = {
  selectedId: IntegrationId | null;
  onSelect: (id: IntegrationId) => void;
  onContinueWithout: () => void;
};

export function OnboardingStoreStep({
  selectedId,
  onSelect,
  onContinueWithout,
}: OnboardingStoreStepProps) {
  const t = useT();

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <OnboardingStepper currentStep="store" className="mb-10 md:mb-12" />

      <header className="mx-auto max-w-[720px] text-center">
        <h2 className="text-[28px] font-semibold tracking-tight text-foreground md:text-[32px]">
          {t("onboarding.store.headline")}
        </h2>
        <p className="mt-3 text-[15px] text-muted-foreground md:text-[16px]">
          {t("onboarding.store.body")}
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 md:mt-10 md:grid-cols-2 xl:grid-cols-3">
        {INTEGRATION_OPTIONS.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            selected={selectedId === integration.id}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="mt-10 text-center">
        <button
          type="button"
          onClick={onContinueWithout}
          className="text-[14px] text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40"
        >
          {t("onboarding.continueWithoutStore")}
        </button>
      </div>
    </div>
  );
}

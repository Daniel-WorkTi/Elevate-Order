import { Layers3, PackageSearch, ShieldAlert } from "lucide-react";

import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import type { IntegrationId } from "@/components/onboarding/types";
import { useT } from "@/lib/i18n/locale-context";

const POINTS = [
  { icon: Layers3, key: "tabs" as const },
  { icon: ShieldAlert, key: "incidents" as const },
  { icon: PackageSearch, key: "tracking" as const },
] as const;

type OnboardingOrdersStepProps = {
  selectedId: IntegrationId | null;
  onBack: () => void;
  onContinue: () => void;
};

export function OnboardingOrdersStep({
  selectedId,
  onBack,
  onContinue,
}: OnboardingOrdersStepProps) {
  const t = useT();
  const supplyHint = selectedId
    ? t(`onboarding.orders.supply.${selectedId}`)
    : t("onboarding.orders.supply.any");

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <OnboardingStepper currentStep="orders" className="mb-10 md:mb-12" />

      <header className="text-center">
        <h2 className="text-[28px] font-semibold tracking-tight text-foreground md:text-[32px]">
          {t("onboarding.orders.headline")}
        </h2>
        <p className="mt-3 text-[15px] text-muted-foreground md:text-[16px]">
          {t("onboarding.orders.body")}
        </p>
        <p className="mt-2 text-[13px] font-medium text-[color:var(--elevate-blue)]">{supplyHint}</p>
      </header>

      <ul className="mt-8 space-y-3">
        {POINTS.map(({ icon: Icon, key }) => (
          <li
            key={key}
            className="flex gap-4 rounded-[14px] border border-border bg-card p-4"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[color:var(--elevate-blue-soft)] text-[color:var(--elevate-blue)]">
              <Icon className="size-5" strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-foreground">
                {t(`onboarding.orders.point.${key}.title`)}
              </p>
              <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                {t(`onboarding.orders.point.${key}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <OnboardingNav
        onBack={onBack}
        onContinue={onContinue}
        backLabel={t("onboarding.back")}
        continueLabel={t("onboarding.continue")}
      />
    </div>
  );
}

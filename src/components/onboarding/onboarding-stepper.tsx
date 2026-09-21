import { Check } from "lucide-react";

import { ONBOARDING_STEPS } from "@/components/onboarding/integrations";
import type { OnboardingStepId } from "@/components/onboarding/types";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

type OnboardingStepperProps = {
  currentStep?: OnboardingStepId;
  className?: string;
};

export function OnboardingStepper({
  currentStep = "configuration",
  className,
}: OnboardingStepperProps) {
  const t = useT();
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <ol
      aria-label={t("onboarding.progressAria")}
      className={cn(
        "mx-auto flex w-full max-w-[720px] items-start justify-between gap-4 sm:gap-6",
        className,
      )}
    >
      {ONBOARDING_STEPS.map((step, index) => {
        const active = index === currentIndex;
        const complete = index < currentIndex;
        const showLine = index < ONBOARDING_STEPS.length - 1;

        return (
          <li key={step.id} className="relative flex min-w-0 flex-1 flex-col items-center">
            <div className="relative flex w-full items-center justify-center">
              {showLine ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-[18px] left-[calc(50%+22px)] right-[calc(-50%+22px)] h-px",
                    complete || active ? "bg-[color:var(--elevate-blue)]/40" : "bg-border",
                  )}
                />
              ) : null}
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "relative z-[1] grid size-9 place-items-center rounded-full text-[14px] font-semibold tabular-nums transition-colors duration-150",
                  active
                    ? "bg-[color:var(--elevate-blue)] text-white shadow-[0_0_0_4px_color-mix(in_srgb,var(--elevate-blue)_16%,transparent)]"
                    : complete
                      ? "bg-[color:var(--elevate-blue)] text-white"
                      : "border border-border bg-card text-muted-foreground",
                )}
              >
                {complete ? <Check className="size-4" strokeWidth={2} /> : step.number}
              </span>
            </div>
            <span
              className={cn(
                "mt-3 max-w-full truncate text-center text-[14px] font-medium tracking-tight",
                active || complete
                  ? "text-[color:var(--elevate-blue)]"
                  : "text-muted-foreground",
              )}
            >
              {t(`onboarding.step.${step.id}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

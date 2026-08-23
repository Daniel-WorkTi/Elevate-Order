import { ONBOARDING_STEPS } from "@/components/onboarding/integrations";
import type { OnboardingStepId } from "@/components/onboarding/types";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

type OnboardingStepperProps = {
  currentStep?: OnboardingStepId;
  className?: string;
};

export function OnboardingStepper({ currentStep = "store", className }: OnboardingStepperProps) {
  const t = useT();
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <ol
      aria-label={t("onboarding.progressAria")}
      className={cn(
        "mx-auto flex w-full max-w-[960px] items-start justify-between gap-2",
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
                    "absolute top-4 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-px",
                    complete || active ? "bg-[color:var(--elevate-blue)]/35" : "bg-border",
                  )}
                />
              ) : null}
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "relative z-[1] grid size-8 place-items-center rounded-full text-[13px] font-semibold tabular-nums transition-colors duration-150",
                  active
                    ? "bg-[color:var(--elevate-blue)] text-white"
                    : "border border-border bg-card text-muted-foreground",
                )}
              >
                {step.number}
              </span>
            </div>
            <span
              className={cn(
                "mt-2.5 max-w-full truncate text-center text-[13px] font-medium",
                active ? "text-[color:var(--elevate-blue)]" : "text-muted-foreground",
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

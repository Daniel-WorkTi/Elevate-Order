import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OnboardingNavProps = {
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel: string;
  backLabel: string;
  continueDisabled?: boolean;
  className?: string;
};

export function OnboardingNav({
  onBack,
  onContinue,
  continueLabel,
  backLabel,
  continueDisabled,
  className,
}: OnboardingNavProps) {
  return (
    <div className={cn("mt-10 flex flex-wrap items-center justify-between gap-3", className)}>
      {onBack ? (
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-10 rounded-[10px] border-border px-4 text-[14px] shadow-none"
        >
          {backLabel}
        </Button>
      ) : (
        <span />
      )}
      {onContinue ? (
        <Button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled}
          className="h-10 rounded-[10px] bg-[color:var(--elevate-blue)] px-5 text-[14px] text-white shadow-none hover:bg-[color:var(--elevate-blue-hover)]"
        >
          {continueLabel}
        </Button>
      ) : null}
    </div>
  );
}

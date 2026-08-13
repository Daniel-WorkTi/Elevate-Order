import { Link } from "@tanstack/react-router";

import { CustomApiCard } from "@/components/onboarding/custom-api-card";
import { INTEGRATION_OPTIONS } from "@/components/onboarding/integrations";
import { IntegrationCard } from "@/components/onboarding/integration-card";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { Separator } from "@/components/ui/separator";

export function OnboardingStoreStep() {
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <OnboardingStepper currentStep="store" className="mb-10 md:mb-12" />

      <header className="mx-auto max-w-[720px] text-center">
        <h2 className="text-[28px] font-semibold tracking-tight text-foreground md:text-[38px]">
          Connect your first store
        </h2>
        <p className="mt-3 text-[15px] text-muted-foreground md:mt-4 md:text-[16px]">
          Import your orders and start managing your operation in minutes.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 md:mt-10 md:grid-cols-2 xl:grid-cols-3">
        {INTEGRATION_OPTIONS.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>

      <CustomApiCard className="mt-6" />

      <div className="mt-10 flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-[13px] text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <div className="mt-5 text-center">
        <Link
          to="/"
          className="text-[14px] font-medium text-[color:var(--elevate-blue)] transition-colors hover:text-[color:var(--elevate-blue-hover)] focus-visible:rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40"
        >
          I&apos;ll configure this later
        </Link>
      </div>
    </div>
  );
}

import { useId } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

type ConnectSpinButtonProps = {
  label: string;
  ariaLabel: string;
  className?: string;
  onClick?: () => void;
};

/** Blue neon connect CTA — stays in-flow (button, not a route link). */
export function ConnectSpinButton({
  label,
  ariaLabel,
  className,
  onClick,
}: ConnectSpinButtonProps) {
  const uid = useId().replace(/:/g, "");
  const filterId = `elevate-spin-rim-${uid}`;

  return (
    <div className={cn("onboarding-spin-btn", className)}>
      <svg className="onboarding-spin-btn__defs" aria-hidden="true" focusable="false">
        <filter id={filterId} width="200%" x="-50%" height="200%" y="-50%">
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 2.5 0" />
        </filter>
      </svg>

      <button
        type="button"
        className="onboarding-spin-btn__hit"
        aria-label={ariaLabel}
        onClick={onClick}
      />

      <div className="onboarding-spin-btn__shell" aria-hidden="true">
        <div className="onboarding-spin-btn__border">
          <div
            className="onboarding-spin-btn__spin"
            style={{ filter: `blur(1px) url(#${filterId})` }}
          />
          <div className="onboarding-spin-btn__face">
            <span>{label}</span>
            <ArrowRight className="size-3.5" strokeWidth={1.75} />
          </div>
        </div>
      </div>
    </div>
  );
}

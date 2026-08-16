import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import type { IntegrationOption } from "@/components/onboarding/types";
import { cn } from "@/lib/utils";

type IntegrationCardProps = {
  integration: IntegrationOption;
  className?: string;
};

export function IntegrationCard({ integration, className }: IntegrationCardProps) {
  const { Icon } = integration;

  return (
    <article
      className={cn(
        "flex h-full min-h-[280px] flex-col rounded-[16px] border border-border bg-card p-6 transition-[border-color,box-shadow] duration-200",
        "hover:border-[color:var(--elevate-blue)]/35 hover:shadow-[0_1px_2px_rgb(10_12_16/0.06)]",
        className,
      )}
    >
      <div
        className={cn("grid size-12 place-items-center rounded-[12px]", integration.accentClass)}
      >
        <Icon className="size-full object-contain" />
      </div>

      <h3 className="mt-5 text-[18px] font-semibold tracking-tight text-foreground">
        {integration.name}
      </h3>
      <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted-foreground">
        {integration.description}
      </p>

      <Link
        to={integration.connectTo}
        search={integration.search}
        className={cn(
          "mt-6 inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card px-4 text-[14px] font-medium text-[color:var(--elevate-blue)] transition-colors duration-150",
          "hover:border-[color:var(--elevate-blue)]/40 hover:bg-[color:var(--elevate-blue-soft)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40",
        )}
        aria-label={`Connect ${integration.name}`}
      >
        Connect
        <ArrowRight className="size-4" strokeWidth={1.5} />
      </Link>
    </article>
  );
}

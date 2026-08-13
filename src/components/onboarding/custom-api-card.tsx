import { Link } from "@tanstack/react-router";
import { ArrowRight, Code2 } from "lucide-react";

import { cn } from "@/lib/utils";

type CustomApiCardProps = {
  className?: string;
};

export function CustomApiCard({ className }: CustomApiCardProps) {
  return (
    <div
      className={cn(
        "flex min-h-[110px] flex-col items-start justify-between gap-4 rounded-[16px] border border-border bg-card px-5 py-5 sm:flex-row sm:items-center sm:px-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-muted text-foreground">
          <Code2 className="size-5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0">
          <p className="text-[16px] font-semibold tracking-tight text-foreground">Custom API</p>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Connect using our webhook integration.
          </p>
        </div>
      </div>

      <Link
        to="/integracao-api"
        className={cn(
          "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card px-4 text-[14px] font-medium text-[color:var(--elevate-blue)] transition-colors duration-150",
          "hover:border-[color:var(--elevate-blue)]/40 hover:bg-[color:var(--elevate-blue-soft)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40",
        )}
        aria-label="Use webhook integration"
      >
        Use webhook
        <ArrowRight className="size-4" strokeWidth={1.5} />
      </Link>
    </div>
  );
}

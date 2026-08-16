import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { SupplyMark } from "@/components/supply-logo";
import type { Supply } from "@/lib/order-domain";
import { cn } from "@/lib/utils";

export function ConnectionHero({
  supply,
  title,
  subtitle,
  statusLabel,
  statusClass,
  methodLabel,
}: {
  supply: Supply;
  title: string;
  subtitle: string;
  statusLabel: string;
  statusClass: string;
  methodLabel: string;
}) {
  return (
    <div className="space-y-4">
      <Link
        to="/connections"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#667085] hover:text-[#0A0C10]"
      >
        <ArrowLeft className="size-3.5" strokeWidth={1.75} />
        Connections
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <SupplyMark supply={supply} size={44} className="rounded-[10px]" />
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0A0C10]">{title}</h1>
            <p className="mt-0.5 text-[13px] text-[#667085]">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
              statusClass,
            )}
          >
            <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />
            {statusLabel}
          </span>
          <span className="text-[12px] text-[#667085]">Method: {methodLabel}</span>
        </div>
      </div>
    </div>
  );
}

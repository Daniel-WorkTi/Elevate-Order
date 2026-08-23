import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { SupplyMark } from "@/components/supply-logo";
import { useT } from "@/lib/i18n/locale-context";
import type { Supply } from "@/lib/order-domain";
import { cn } from "@/lib/utils";

export function ConnectionHero({
  supply,
  title,
  subtitle,
  statusLabel,
  statusClass,
  statusDotClass,
  methodLabel,
}: {
  supply: Supply;
  title: string;
  subtitle: string;
  statusLabel: string;
  statusClass: string;
  statusDotClass?: string;
  methodLabel: string;
}) {
  const t = useT();

  return (
    <div className="space-y-4">
      <Link
        to="/connections"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#667085] hover:text-[#0A0C10]"
      >
        <ArrowLeft className="size-3.5" strokeWidth={1.75} />
        {t("connections.back")}
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
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                statusDotClass ?? "bg-current opacity-70",
              )}
              aria-hidden
            />
            {statusLabel}
          </span>
          <span className="text-[12px] text-[#667085]">
            {t("connections.method", { method: methodLabel })}
          </span>
        </div>
      </div>
    </div>
  );
}

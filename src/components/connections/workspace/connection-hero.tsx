import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { SupplyMark } from "@/components/supply-logo";
import { useT } from "@/lib/i18n/locale-context";
import type { Supply } from "@/lib/order-domain";
import { cn } from "@/lib/utils";

export function ConnectionHero({
  supply,
  title,
  statusLabel,
  statusClass,
  statusDotClass,
}: {
  supply: Supply;
  title: string;
  statusLabel: string;
  statusClass: string;
  statusDotClass?: string;
}) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link
          to="/connections"
          className="inline-flex items-center text-[#667085] hover:text-[#0A0C10]"
          aria-label={t("connections.back")}
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
        <SupplyMark supply={supply} size={36} className="rounded-[10px]" />
        <h1 className="text-[18px] font-semibold tracking-tight text-[#0A0C10]">{title}</h1>
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
          statusClass,
        )}
      >
        <span
          className={cn("size-2 shrink-0 rounded-full", statusDotClass ?? "bg-current opacity-70")}
          aria-hidden
        />
        {statusLabel}
      </span>
    </div>
  );
}

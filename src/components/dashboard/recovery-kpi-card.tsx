import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function RecoveryKpiCard({
  label,
  value,
  icon: Icon,
  iconClass,
  iconWrapClass,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass: string;
  iconWrapClass: string;
}) {
  return (
    <article className="flex items-center gap-3.5 rounded-[16px] border border-[#E6E8EC] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-[12px]",
          iconWrapClass,
        )}
      >
        <Icon className={cn("size-5", iconClass)} strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#667085]">{label}</p>
        <p className="mt-0.5 truncate text-[22px] font-semibold tabular-nums tracking-tight text-[#0A0C10]">
          {value}
        </p>
      </div>
    </article>
  );
}

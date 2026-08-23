import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ConnectionRow({
  to,
  icon,
  title,
  statusLabel,
  tone,
}: {
  to: "/connections/shopify" | "/connections/dropi" | "/connections/dropea";
  icon: ReactNode;
  title: string;
  statusLabel: string;
  tone: "ok" | "wait" | "off";
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-[14px] border border-[#E6E8EC] bg-white px-4 py-3.5 transition-colors hover:border-[#2563EB]/35"
    >
      {icon}
      <p className="min-w-0 flex-1 text-[14px] font-semibold text-[#0A0C10]">{title}</p>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
          tone === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-800",
          tone === "wait" && "border-amber-200 bg-amber-50 text-amber-900",
          tone === "off" && "border-[#E6E8EC] bg-[#F7F8FA] text-[#667085]",
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            tone === "ok" && "bg-emerald-500",
            tone === "wait" && "bg-amber-500",
            tone === "off" && "bg-[#98A2B3]",
          )}
          aria-hidden
        />
        {statusLabel}
      </span>
      <ArrowRight className="size-4 shrink-0 text-[#667085]" strokeWidth={1.75} />
    </Link>
  );
}

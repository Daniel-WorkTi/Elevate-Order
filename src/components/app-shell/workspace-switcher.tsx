import { ChevronDown } from "lucide-react";

import eronoMark from "@/assets/erono-mark.png";
import { cn } from "@/lib/utils";

export type Workspace = {
  name: string;
  id: string;
};

type WorkspaceSwitcherProps = {
  workspace: Workspace;
  collapsed?: boolean | undefined;
  /** sidebar = dark surface; header = light card surface */
  tone?: "sidebar" | "header" | undefined;
  className?: string | undefined;
};

export function WorkspaceSwitcher({
  workspace,
  collapsed = false,
  tone = "sidebar",
  className,
}: WorkspaceSwitcherProps) {
  const isHeader = tone === "header";

  return (
    <button
      type="button"
      className={cn(
        "group flex items-center gap-2.5 rounded-[10px] border text-left transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/50",
        isHeader
          ? "w-auto max-w-[220px] border-[#E6E8EC] bg-white px-2.5 py-1.5 hover:border-[#2563EB]/35 hover:bg-[#EFF6FF]/40"
          : "w-full border-transparent bg-[color:var(--elevate-sidebar-surface)] hover:border-white/10",
        !isHeader && (collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"),
        className,
      )}
      aria-label={`Workspace ${workspace.name}, ID ${workspace.id}`}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden rounded-[8px] bg-white",
          isHeader ? "size-7" : "size-8",
          !isHeader && "bg-white/[0.06]",
        )}
      >
        <img
          src={eronoMark}
          alt=""
          width={isHeader ? 24 : 28}
          height={isHeader ? 24 : 28}
          className={cn("object-contain", isHeader ? "size-6" : "size-7")}
          decoding="async"
        />
      </span>
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate font-medium",
                isHeader ? "text-[13px] text-[#0A0C10]" : "text-[13px] text-white",
              )}
            >
              {workspace.name}
            </span>
            <span
              className={cn(
                "mt-0.5 block truncate",
                isHeader
                  ? "text-[11px] text-[#667085]"
                  : "text-[11px] text-[color:var(--sidebar-muted)]",
              )}
            >
              ID: {workspace.id}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 transition-colors",
              isHeader
                ? "text-[#667085] group-hover:text-[#0A0C10]"
                : "text-[color:var(--sidebar-muted)] group-hover:text-sidebar-foreground",
            )}
            strokeWidth={1.5}
          />
        </>
      ) : null}
    </button>
  );
}

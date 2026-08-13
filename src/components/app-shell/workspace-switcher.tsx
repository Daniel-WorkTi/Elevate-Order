import { ChevronDown, ShoppingBag } from "lucide-react";

import { cn } from "@/lib/utils";

export type Workspace = {
  name: string;
  id: string;
};

type WorkspaceSwitcherProps = {
  workspace: Workspace;
  collapsed?: boolean;
  className?: string;
};

export function WorkspaceSwitcher({
  workspace,
  collapsed = false,
  className,
}: WorkspaceSwitcherProps) {
  return (
    <button
      type="button"
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-[10px] border border-transparent bg-[color:var(--elevate-sidebar-surface)] text-left transition-colors duration-150",
        "hover:border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/50",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
        className,
      )}
      aria-label={`Workspace ${workspace.name}, ID ${workspace.id}`}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-white/[0.06] text-sidebar-foreground">
        <ShoppingBag className="size-3.5" strokeWidth={1.5} />
      </span>
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-white">
              {workspace.name}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-[color:var(--sidebar-muted)]">
              ID: {workspace.id}
            </span>
          </span>
          <ChevronDown
            className="size-3.5 shrink-0 text-[color:var(--sidebar-muted)] transition-colors group-hover:text-sidebar-foreground"
            strokeWidth={1.5}
          />
        </>
      ) : null}
    </button>
  );
}

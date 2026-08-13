import { Link } from "@tanstack/react-router";

import { APP_NAVIGATION, isNavActive, type AppNavItem } from "@/components/app-shell/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  pathname: string;
  inboxCount?: number | undefined;
  collapsed?: boolean | undefined;
  onNavigate?: (() => void) | undefined;
};

export function SidebarNav({
  pathname,
  inboxCount,
  collapsed = false,
  onNavigate,
}: SidebarNavProps) {
  return (
    <nav aria-label="Main" className={cn("flex flex-1 flex-col gap-1", collapsed ? "px-2" : "px-3")}>
      {APP_NAVIGATION.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isNavActive(pathname, item.href)}
          badge={item.showBadge ? inboxCount : undefined}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function NavLink({
  item,
  active,
  badge,
  collapsed,
  onNavigate,
}: {
  item: AppNavItem;
  active: boolean;
  badge?: number | undefined;
  collapsed: boolean;
  onNavigate?: (() => void) | undefined;
}) {
  const showBadge = typeof badge === "number" && badge > 0;

  const link = (
    <Link
      to={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center rounded-[12px] text-[14px] font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/60",
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
        active
          ? "bg-[color:var(--elevate-sidebar-surface)] text-white"
          : "text-[color:var(--sidebar-muted)] hover:bg-white/[0.04] hover:text-sidebar-foreground",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute top-1/2 left-0 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[color:var(--elevate-blue)]"
        />
      ) : null}
      <item.icon
        className={cn("size-[18px] shrink-0", active ? "text-white" : "opacity-90")}
        strokeWidth={1.5}
      />
      {!collapsed ? (
        <>
          <span className="flex-1 tracking-[-0.01em]">{item.label}</span>
          {showBadge ? (
            <span className="min-w-6 rounded-full bg-[color:var(--elevate-blue)] px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums text-white">
              {badge}
            </span>
          ) : null}
        </>
      ) : showBadge ? (
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[color:var(--elevate-blue)]" />
      ) : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="rounded-[8px] border-border bg-card text-foreground">
        {item.label}
        {showBadge ? ` (${badge})` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

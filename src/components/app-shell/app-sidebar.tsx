import { Link } from "@tanstack/react-router";

import markAsset from "@/assets/elevate-mark.png.asset.json";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { UserMenu, type Operator } from "@/components/app-shell/user-menu";
import { WorkspaceSwitcher, type Workspace } from "@/components/app-shell/workspace-switcher";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  pathname: string;
  workspace: Workspace;
  operator: Operator;
  inboxCount?: number | undefined;
  collapsed?: boolean | undefined;
  className?: string | undefined;
  onNavigate?: (() => void) | undefined;
};

export function AppSidebar({
  pathname,
  workspace,
  operator,
  inboxCount,
  collapsed = false,
  className,
  onNavigate,
}: AppSidebarProps) {
  return (
    <aside
      className={cn(
        "sticky top-0 z-40 flex h-screen shrink-0 flex-col bg-[color:var(--elevate-sidebar)] text-sidebar-foreground",
        collapsed ? "w-[72px]" : "w-[264px]",
        className,
      )}
    >
      <div className={cn("px-6 pt-8 pb-5", collapsed && "px-3 pt-6")}>
        <Link
          to="/"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/50",
            collapsed && "justify-center",
          )}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white">
            <img
              src={markAsset.url}
              alt=""
              className="size-[22px]"
              width={22}
              height={22}
              decoding="async"
              fetchPriority="high"
            />
          </span>
          {!collapsed ? (
            <span className="flex min-w-0 flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight text-white">ELEVATE</span>
              <span className="mt-1 text-[12px] text-[color:var(--sidebar-muted)]">Orders</span>
            </span>
          ) : (
            <span className="sr-only">ELEVATE Orders</span>
          )}
        </Link>
      </div>

      <div className={cn("px-4 pb-5", collapsed && "px-2")}>
        <WorkspaceSwitcher workspace={workspace} collapsed={collapsed} />
      </div>

      <div className="mx-4 mb-3 border-t border-white/[0.06]" />

      <SidebarNav
        pathname={pathname}
        inboxCount={inboxCount}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />

      <div className="mt-auto border-t border-white/[0.06] p-3">
        <UserMenu operator={operator} collapsed={collapsed} />
      </div>
    </aside>
  );
}

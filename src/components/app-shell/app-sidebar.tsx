import { PanelLeft, PanelLeftClose } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { MouseEvent } from "react";

import markUrl from "@/assets/elevate-mark.png";
import { LanguageSwitcher } from "@/components/app-shell/language-switcher";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { UserMenu, type Operator } from "@/components/app-shell/user-menu";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  pathname: string;
  operator: Operator;
  inboxCount?: number | undefined;
  collapsed?: boolean | undefined;
  className?: string | undefined;
  onNavigate?: (() => void) | undefined;
  onToggleCollapse?: (() => void) | undefined;
};

export function AppSidebar({
  pathname,
  operator,
  inboxCount,
  collapsed = false,
  className,
  onNavigate,
  onToggleCollapse,
}: AppSidebarProps) {
  const t = useT();

  function handleCollapsedClick(event: MouseEvent<HTMLElement>) {
    if (!collapsed || !onToggleCollapse) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-sidebar-collapse]")) return;
    if (target?.closest("a,button,[role='group']")) return;
    onToggleCollapse();
  }

  return (
    <aside
      className={cn(
        "flex h-dvh min-h-dvh w-full shrink-0 flex-col bg-[color:var(--elevate-sidebar)] text-sidebar-foreground",
        collapsed && "cursor-pointer",
        className,
      )}
      title={collapsed ? t("shell.clickToExpand") : undefined}
      onClick={handleCollapsedClick}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-2 px-6 pt-8 pb-5",
          collapsed && "flex-col items-center justify-start gap-3 px-3 pt-6",
        )}
      >
        <Link
          to="/"
          onClick={onNavigate}
          className={cn(
            "flex min-w-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/50",
            collapsed && "justify-center",
          )}
          aria-label={t("shell.homeAria")}
        >
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-white">
            <img
              src={markUrl}
              alt=""
              className="size-9 object-contain"
              width={36}
              height={36}
              decoding="async"
              fetchPriority="high"
            />
          </span>
          {!collapsed ? (
            <span className="flex min-w-0 flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight text-white">ELEVATE</span>
              <span className="mt-1 text-[12px] text-[color:var(--sidebar-muted)]">
                {t("shell.productSubtitle")}
              </span>
            </span>
          ) : (
            <span className="sr-only">ELEVATE {t("shell.productSubtitle")}</span>
          )}
        </Link>

        {onToggleCollapse ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-sidebar-collapse=""
            className="size-8 shrink-0 rounded-[8px] text-[color:var(--sidebar-muted)] hover:bg-white/[0.06] hover:text-white"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleCollapse();
            }}
            aria-label={collapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeft className="size-4" strokeWidth={1.5} />
            ) : (
              <PanelLeftClose className="size-4" strokeWidth={1.5} />
            )}
          </Button>
        ) : null}
      </div>

      <div className={cn("mb-3 border-t border-white/[0.06]", collapsed ? "mx-2" : "mx-4")} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <SidebarNav
          pathname={pathname}
          inboxCount={inboxCount}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </div>

      <div className="mt-auto shrink-0 space-y-2 border-t border-white/[0.06] p-3">
        <UserMenu operator={operator} collapsed={collapsed} />
        <LanguageSwitcher collapsed={collapsed} />
      </div>
    </aside>
  );
}

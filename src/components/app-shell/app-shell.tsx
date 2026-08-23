import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { getRouteApi, useRouterState } from "@tanstack/react-router";

import { AppHeader } from "@/components/app-shell/app-header";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import type { Operator } from "@/components/app-shell/user-menu";
import type { Workspace } from "@/components/app-shell/workspace-switcher";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStoreConnectionPreference } from "@/hooks/use-store-connection-preference";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import type { AuthUser } from "@/lib/auth/session.functions";
import { queryInboxQueue } from "@/lib/inbox/inbox.functions";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

const rootRoute = getRouteApi("__root__");
const SIDEBAR_COLLAPSED_KEY = "elevate.sidebar.collapsed";

const DEFAULT_WORKSPACE: Workspace = {
  name: "Erono Store",
  id: "4321",
};

const DEFAULT_OPERATOR: Operator = {
  name: "Operator",
  role: "Operator",
  initials: "OP",
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "OP";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function operatorFromUser(user: AuthUser | null | undefined): Operator {
  if (!user) return DEFAULT_OPERATOR;
  const name = user.fullName?.trim() || user.email?.trim() || "Operator";
  return {
    name,
    role: "Operator",
    initials: initialsFromName(name),
  };
}

function readCollapsedPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsedPreference(collapsed: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // ignore storage failures
  }
}

export type AppShellProps = {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  /** Optional attention count for Inbox badge. Omit to use the live inbox queue. */
  inboxCount?: number | undefined;
  workspace?: Workspace | undefined;
  operator?: Operator | undefined;
  className?: string | undefined;
};

export function AppShell({
  title,
  subtitle,
  children,
  inboxCount,
  workspace: workspaceProp,
  operator: operatorProp,
  className,
}: AppShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = rootRoute.useRouteContext();
  const t = useT();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);
  const store = useStoreConnectionPreference();
  const { workspaceId } = useWorkspaceId();
  const inboxQuery = useQuery({
    queryKey: ["inbox", "queue", workspaceId],
    queryFn: () => queryInboxQueue({ data: { workspaceId } }),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });
  const liveInboxCount =
    (inboxQuery.data?.dropi.length ?? 0) + (inboxQuery.data?.dropea.length ?? 0);
  const resolvedInboxCount = inboxCount ?? liveInboxCount;
  const operator =
    operatorProp ??
    (() => {
      const base = operatorFromUser(user);
      return { ...base, role: t("shell.operatorRole") };
    })();

  const workspace = useMemo((): Workspace => {
    if (workspaceProp) return workspaceProp;
    if (store.linked && store.storeName) {
      return {
        name: store.storeName,
        id: store.storeDomain ?? DEFAULT_WORKSPACE.id,
      };
    }
    return DEFAULT_WORKSPACE;
  }, [workspaceProp, store.linked, store.storeName, store.storeDomain]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      writeCollapsedPreference(next);
      return next;
    });
  }

  const sidebarWidth = collapsed ? "w-[72px]" : "w-[264px]";

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex min-h-dvh w-full bg-background", className)}>
        {/* Desktop / tablet: fixed full-height sidebar */}
        <div className={cn("relative hidden shrink-0 md:block", sidebarWidth)} aria-hidden={false}>
          <div className={cn("fixed inset-y-0 left-0 z-40 hidden md:block", sidebarWidth)}>
            <AppSidebar
              pathname={pathname}
              operator={operator}
              inboxCount={resolvedInboxCount}
              collapsed={collapsed}
              onToggleCollapse={toggleCollapsed}
            />
          </div>
        </div>

        <div className="flex min-h-dvh min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader
            title={title}
            subtitle={subtitle}
            workspace={workspace}
            onOpenMobileNav={() => setMobileOpen(true)}
          />

          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-4 py-6 md:px-8 md:py-8">{children}</div>
          </main>
        </div>

        {/* Mobile drawer: full viewport height */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="h-dvh w-[280px] max-w-[85vw] border-r-0 bg-[color:var(--elevate-sidebar)] p-0 text-sidebar-foreground [&>button]:text-white"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{t("shell.navigation")}</SheetTitle>
            </SheetHeader>
            <AppSidebar
              pathname={pathname}
              operator={operator}
              inboxCount={resolvedInboxCount}
              onNavigate={() => setMobileOpen(false)}
              className="h-dvh w-full"
            />
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

import { AppHeader } from "@/components/app-shell/app-header";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import type { Operator } from "@/components/app-shell/user-menu";
import type { Workspace } from "@/components/app-shell/workspace-switcher";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStoreConnectionPreference } from "@/hooks/use-store-connection-preference";
import { orders } from "@/lib/orders";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "elevate.sidebar.collapsed";

function attentionFromOrders() {
  return orders.filter((o) => o.status === "incident" || o.status === "unanswered").length;
}

const DEFAULT_WORKSPACE: Workspace = {
  name: "Erono Store",
  id: "4321",
};

const DEFAULT_OPERATOR: Operator = {
  name: "Rocío M.",
  role: "Operator",
  initials: "RM",
};

function readCollapsedPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export type AppShellProps = {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  /** Optional attention count for Inbox badge. Omit to use mock attention count. */
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
  operator = DEFAULT_OPERATOR,
  className,
}: AppShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const store = useStoreConnectionPreference();
  const resolvedInboxCount = inboxCount ?? attentionFromOrders();

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

  useEffect(() => {
    setCollapsed(readCollapsedPreference());
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex min-h-dvh w-full bg-background", className)}>
        {/* Desktop / tablet: fixed full-height sidebar */}
        <div
          className={cn(
            "relative hidden shrink-0 md:block",
            collapsed ? "w-[72px]" : "w-[264px]",
          )}
          aria-hidden={false}
        >
          <div className="fixed inset-y-0 left-0 z-40 hidden md:block">
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
              <SheetTitle>Navigation</SheetTitle>
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

import { useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

import { AppHeader } from "@/components/app-shell/app-header";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import type { Operator } from "@/components/app-shell/user-menu";
import type { Workspace } from "@/components/app-shell/workspace-switcher";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { orders } from "@/lib/orders";
import { cn } from "@/lib/utils";

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

export type AppShellProps = {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  /** Optional attention count for Inbox badge. Omit to use mock attention count. */
  inboxCount?: number | undefined;
  workspace?: Workspace | undefined;
  operator?: Operator | undefined;
  currency?:
    | {
        from?: string | undefined;
        to?: string | undefined;
        rate?: number | null | undefined;
        updatedAt?: Date | string | null | undefined;
      }
    | undefined;
  className?: string | undefined;
};

export function AppShell({
  title,
  subtitle,
  children,
  inboxCount,
  workspace = DEFAULT_WORKSPACE,
  operator = DEFAULT_OPERATOR,
  currency,
  className,
}: AppShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const resolvedInboxCount = inboxCount ?? attentionFromOrders();

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex min-h-screen w-full bg-background", className)}>
        {/* Tablet+ desktop sidebar: collapsed icons md–lg, full from lg */}
        <div className="hidden md:block">
          <div className="lg:hidden">
            <AppSidebar
              pathname={pathname}
              workspace={workspace}
              operator={operator}
              inboxCount={resolvedInboxCount}
              collapsed
            />
          </div>
          <div className="hidden lg:block">
            <AppSidebar
              pathname={pathname}
              workspace={workspace}
              operator={operator}
              inboxCount={resolvedInboxCount}
            />
          </div>
        </div>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader
            title={title}
            subtitle={subtitle}
            operator={operator}
            currency={currency}
            onOpenMobileNav={() => setMobileOpen(true)}
          />

          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-4 py-6 md:px-8 md:py-8">{children}</div>
          </main>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-[280px] border-r-0 bg-[color:var(--elevate-sidebar)] p-0 text-sidebar-foreground [&>button]:text-white"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <AppSidebar
              pathname={pathname}
              workspace={workspace}
              operator={operator}
              inboxCount={resolvedInboxCount}
              onNavigate={() => setMobileOpen(false)}
              className="h-full w-full"
            />
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

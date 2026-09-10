import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { getRouteApi, useRouterState } from "@tanstack/react-router";

import { AppHeader } from "@/components/app-shell/app-header";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import type { Operator } from "@/components/app-shell/user-menu";
import type { Workspace } from "@/components/app-shell/workspace-switcher";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsBelowLg } from "@/hooks/use-mobile";
import { useStoreConnectionPreference } from "@/hooks/use-store-connection-preference";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import type { AuthUser } from "@/lib/auth/session.functions";
import { queryInboxQueue } from "@/lib/inbox/inbox.functions";
import { getShopifyOauthStatus } from "@/lib/integrations/shopify/oauth.functions";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

const rootRoute = getRouteApi("__root__");
const SIDEBAR_COLLAPSED_KEY = "elevate.sidebar.collapsed";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "OP";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function operatorFromUser(user: AuthUser | null | undefined): Operator {
  if (!user) return { name: "Operator", role: "Operator", initials: "OP" };
  const name = user.fullName?.trim() || user.email?.trim() || "Operator";
  return {
    name,
    role: "Operator",
    initials: initialsFromName(name),
  };
}

function shopDisplayName(domain: string | null | undefined) {
  if (!domain) return null;
  const short = domain.replace(/\.myshopify\.com$/i, "");
  return short || domain;
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
  const isBelowLg = useIsBelowLg();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);
  const { workspaceId } = useWorkspaceId();
  const store = useStoreConnectionPreference(workspaceId);
  const oauthQuery = useQuery({
    queryKey: ["connections", "shopify", "oauth", "shell"],
    queryFn: () => getShopifyOauthStatus(),
    staleTime: 30_000,
    retry: false,
  });
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
    const oauthShop = oauthQuery.data?.connected ? oauthQuery.data.shopDomain : null;
    const domain = oauthShop ?? store.storeDomain;
    const nameFromShop = shopDisplayName(domain) ?? store.storeName;
    if (nameFromShop && domain) {
      return { name: nameFromShop, id: domain };
    }
    if (store.linked && store.storeName) {
      return {
        name: store.storeName,
        id: store.storeDomain ?? "",
      };
    }
    return {
      name: t("shell.shopifyConnect"),
      id: "",
    };
  }, [
    workspaceProp,
    oauthQuery.data?.connected,
    oauthQuery.data?.shopDomain,
    store.linked,
    store.storeName,
    store.storeDomain,
    t,
  ]);

  /** Tablet (md–lg): always icon rail so content keeps width. Desktop: user preference. */
  const railCollapsed = isBelowLg || collapsed;
  const sidebarWidth = railCollapsed ? "w-[72px]" : "w-[264px]";

  function toggleCollapsed() {
    if (isBelowLg) return;
    setCollapsed((current) => {
      const next = !current;
      writeCollapsedPreference(next);
      return next;
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex min-h-dvh w-full bg-background", className)}>
        <div className={cn("relative hidden shrink-0 md:block", sidebarWidth)} aria-hidden={false}>
          <div className={cn("fixed inset-y-0 left-0 z-40 hidden md:block", sidebarWidth)}>
            <AppSidebar
              pathname={pathname}
              operator={operator}
              inboxCount={resolvedInboxCount}
              collapsed={railCollapsed}
              onToggleCollapse={isBelowLg ? undefined : toggleCollapsed}
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
            <div className="px-4 py-5 md:px-5 md:py-6 lg:px-8 lg:py-8">{children}</div>
          </main>
        </div>

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

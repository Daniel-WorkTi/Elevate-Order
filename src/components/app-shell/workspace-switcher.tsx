import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Eye, EyeOff, Link2, RefreshCw, Unplug } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import shopifyMark from "@/assets/shopify-mark.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStoreConnectionPreference } from "@/hooks/use-store-connection-preference";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import {
  disconnectShopifyStore,
  getShopifyOauthStatus,
  syncConnectedShopifyStore,
} from "@/lib/integrations/shopify/oauth.functions";
import { syncShopifyOrders } from "@/lib/integrations/shopify/shopify.functions";
import { normalizeShopifyDomain } from "@/lib/integrations/shopify/shopify-normalize";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export type Workspace = {
  name: string;
  id: string;
};

type WorkspaceSwitcherProps = {
  workspace: Workspace;
  collapsed?: boolean | undefined;
  /** sidebar = dark surface; header = light Shopify connect chip */
  tone?: "sidebar" | "header" | undefined;
  className?: string | undefined;
};

function shopLabel(domain: string | null | undefined, fallback: string) {
  if (!domain) return fallback;
  return domain.replace(/\.myshopify\.com$/i, "") || domain;
}

/** Header: Shopify store connect + sync. Sidebar: compact identity only. */
export function WorkspaceSwitcher({
  workspace,
  collapsed = false,
  tone = "sidebar",
  className,
}: WorkspaceSwitcherProps) {
  const t = useT();
  const isHeader = tone === "header";

  if (!isHeader) {
    return (
      <SidebarChip
        workspace={workspace}
        collapsed={collapsed}
        className={className}
      />
    );
  }

  return <HeaderShopifyChip className={className} fallback={workspace} />;
}

function SidebarChip({
  workspace,
  collapsed,
  className,
}: {
  workspace: Workspace;
  collapsed: boolean;
  className?: string | undefined;
}) {
  const t = useT();
  return (
    <div
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[10px] border border-transparent bg-[color:var(--elevate-sidebar-surface)] text-left",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
        className,
      )}
      aria-label={t("shell.workspaceAria", { name: workspace.name, id: workspace.id })}
    >
      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-white/[0.06]">
        <img
          src={shopifyMark}
          alt=""
          width={28}
          height={28}
          className="size-7 object-contain"
          decoding="async"
        />
      </span>
      {!collapsed ? (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-white">{workspace.name}</span>
          {workspace.id ? (
            <span className="mt-0.5 block truncate text-[11px] text-[color:var(--sidebar-muted)]">
              {workspace.id}
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

function HeaderShopifyChip({
  className,
  fallback,
}: {
  className?: string | undefined;
  fallback: Workspace;
}) {
  const t = useT();
  const { workspaceId } = useWorkspaceId();
  const store = useStoreConnectionPreference();
  const oauthQuery = useQuery({
    queryKey: ["connections", "shopify", "oauth", "header"],
    queryFn: () => getShopifyOauthStatus(),
    staleTime: 30_000,
    retry: false,
  });

  const oauth = oauthQuery.data;
  const oauthLinked = Boolean(oauth?.connected && oauth.shopDomain);
  const tokenLinked = store.linked && store.accessTokenConfigured && Boolean(store.storeDomain);
  const linked = oauthLinked || tokenLinked;
  const shopDomain = oauth?.shopDomain ?? store.storeDomain ?? null;
  const displayName = linked
    ? shopLabel(shopDomain ?? store.storeName, fallback.name)
    : t("shell.shopifyConnect");
  const displaySub = linked
    ? t("shell.shopifyLinked")
    : t("shell.shopifyConnectHint");

  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [shopInput, setShopInput] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oauthConfigured = Boolean(oauth?.oauthConfigured);

  async function runSync() {
    setSyncing(true);
    try {
      if (oauthLinked) {
        const result = await syncConnectedShopifyStore({
          data: workspaceId ? { workspaceId } : {},
        });
        await oauthQuery.refetch();
        if (!result.ok) {
          toast.error(result.error ?? t("connections.shopifySyncFailed"));
          return;
        }
        toast.success(
          result.imported === 1
            ? t("connections.importedOrdersOne", { count: result.imported })
            : t("connections.importedOrders", { count: result.imported }),
        );
        return;
      }

      const token = store.getAccessToken();
      if (!store.storeDomain || !token) {
        toast.error(t("connections.connectStoreFirst"));
        return;
      }
      const result = await syncShopifyOrders({
        data: {
          storeDomain: store.storeDomain,
          accessToken: token,
          limit: 50,
          ...(workspaceId ? { workspaceId } : {}),
        },
      });
      if (!result.ok) {
        toast.error(result.error ?? t("connections.shopifySyncFailed"));
        return;
      }
      toast.success(
        result.imported === 1
          ? t("connections.importedOrdersOne", { count: result.imported })
          : t("connections.importedOrders", { count: result.imported }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("connections.shopifySyncFailed"));
    } finally {
      setSyncing(false);
    }
  }

  function submitToken() {
    const host = normalizeShopifyDomain(shopInput);
    if (!host) {
      setError(t("connections.domainInvalid"));
      return;
    }
    const ok = store.connect({
      storeName: host,
      storeDomain: shopInput,
      accessToken,
    });
    if (!ok) {
      setError(t("connections.enterStoreFields"));
      return;
    }
    setAccessToken("");
    setError(null);
    toast.success(t("shell.shopifyTokenConnected"));
    setOpen(false);
  }

  function startOauth() {
    const host = normalizeShopifyDomain(shopInput);
    if (!host) {
      setError(t("connections.domainInvalid"));
      return;
    }
    const params = new URLSearchParams({ shop: host });
    if (workspaceId) params.set("workspaceId", workspaceId);
    (window.top ?? window).location.assign(`/auth/shopify?${params.toString()}`);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex max-w-[148px] items-center gap-2 rounded-[10px] border border-[#E6E8EC] bg-white px-2 py-1.5 text-left lg:max-w-[240px] lg:gap-2.5 lg:px-2.5",
            "transition-colors hover:border-[#2563EB]/35 hover:bg-[#EFF6FF]/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35",
            className,
          )}
          aria-label={
            linked
              ? t("shell.workspaceAria", { name: displayName, id: shopDomain ?? displayName })
              : t("shell.shopifyConnectAria")
          }
        >
          <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-white">
            <img
              src={shopifyMark}
              alt=""
              width={24}
              height={24}
              className="size-6 object-contain"
              decoding="async"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-[#0A0C10]">
              {displayName}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-[#667085]">
              {linked ? (
                <span className="inline-flex size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
              ) : null}
              {displaySub}
            </span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-[#667085]" strokeWidth={1.75} aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] rounded-[14px] border border-[#E6E8EC] bg-white p-4 shadow-[0_8px_30px_rgba(10,12,16,0.08)]"
      >
        {linked ? (
          <div className="space-y-3">
            <div>
              <p className="text-[13px] font-semibold text-[#0A0C10]">{t("shell.shopifyStore")}</p>
              <p className="mt-1 font-mono text-[12px] text-[#667085]">
                {shopDomain ?? store.storeName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void runSync()}
                disabled={syncing}
                className="h-9 flex-1 rounded-[10px] bg-[#2563EB] text-[13px] shadow-none hover:bg-[#1D4ED8]"
              >
                <RefreshCw
                  className={cn("size-3.5", syncing && "animate-spin")}
                  strokeWidth={1.75}
                />
                {t("connections.syncNow")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  store.disconnect();
                  if (oauthLinked) {
                    void disconnectShopifyStore().then(() => oauthQuery.refetch());
                  }
                  toast.success(t("shell.shopifyDisconnected"));
                }}
                className="h-9 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
              >
                <Unplug className="size-3.5" strokeWidth={1.75} />
                {t("connections.disconnect")}
              </Button>
            </div>
            <Link
              to="/connections/shopify"
              className="block text-[12px] font-medium text-[#2563EB] hover:underline"
              onClick={() => setOpen(false)}
            >
              {t("shell.shopifyManageConnections")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-[13px] font-semibold text-[#0A0C10]">{t("shell.shopifyConnect")}</p>
              <p className="mt-1 text-[12px] leading-snug text-[#667085]">
                {t("connections.shopifyDomainLoginHint")}
              </p>
            </div>

            {oauthConfigured ? (
              <div className="flex flex-col gap-2">
                <Input
                  value={shopInput}
                  onChange={(event) => {
                    setShopInput(event.target.value);
                    setError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") startOauth();
                  }}
                  placeholder={t("connections.shopifyShopPlaceholder")}
                  className="h-9 rounded-[10px] border-[#E6E8EC] font-mono text-[12px] shadow-none"
                />
                <Button
                  type="button"
                  onClick={startOauth}
                  className="h-9 w-full rounded-[10px] bg-[#2563EB] text-[12px] shadow-none hover:bg-[#1D4ED8]"
                >
                  <Link2 className="size-3.5" strokeWidth={1.75} />
                  {t("connections.installShopify")}
                </Button>
              </div>
            ) : (
              <p className="text-[12px] leading-snug text-[#667085]">
                {t("connections.shopifyOauthMissing")}
              </p>
            )}

            <div className="border-t border-[#E6E8EC] pt-2">
              <button
                type="button"
                onClick={() => setTokenOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-2 text-left"
                aria-expanded={tokenOpen}
              >
                <span className="text-[11px] font-medium text-[#667085]">
                  {t("connections.shopifyOtherWays")}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 text-[#667085] transition-transform",
                    tokenOpen && "rotate-180",
                  )}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </button>

              {tokenOpen ? (
                <div className="mt-2.5 space-y-2">
                  <p className="text-[11px] leading-snug text-[#667085]">
                    {t("connections.shopifyFallbackTokenHint")}
                  </p>
                  {!oauthConfigured ? (
                    <Input
                      value={shopInput}
                      onChange={(event) => {
                        setShopInput(event.target.value);
                        setError(null);
                      }}
                      placeholder={t("connections.shopifyShopPlaceholder")}
                      className="h-9 rounded-[10px] border-[#E6E8EC] font-mono text-[12px] shadow-none"
                    />
                  ) : null}
                  <div className="relative">
                    <Input
                      type={showToken ? "text" : "password"}
                      autoComplete="off"
                      spellCheck={false}
                      value={accessToken}
                      onChange={(event) => {
                        setAccessToken(event.target.value);
                        setError(null);
                      }}
                      placeholder="shpat_…"
                      className="h-9 rounded-[10px] border-[#E6E8EC] pr-9 font-mono text-[12px] shadow-none"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#667085]"
                      onClick={() => setShowToken((value) => !value)}
                      aria-label={showToken ? t("connections.hideToken") : t("connections.showToken")}
                    >
                      {showToken ? (
                        <EyeOff className="size-3.5" strokeWidth={1.5} />
                      ) : (
                        <Eye className="size-3.5" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                  <Button
                    type="button"
                    onClick={submitToken}
                    variant="outline"
                    className="h-9 w-full rounded-[10px] border-[#E6E8EC] text-[12px] shadow-none"
                  >
                    <Link2 className="size-3.5" strokeWidth={1.75} />
                    {t("connections.connectStoreCta")}
                  </Button>
                </div>
              ) : null}
            </div>

            {error ? <p className="text-[12px] font-medium text-red-600">{error}</p> : null}

            <Link
              to="/connections/shopify"
              className="block text-[12px] font-medium text-[#2563EB] hover:underline"
              onClick={() => setOpen(false)}
            >
              {t("shell.shopifyManageConnections")}
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

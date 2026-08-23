import { useQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { SupplyMark } from "@/components/supply-logo";
import shopifyMark from "@/assets/shopify-mark.png";
import { useDropiConnectionPreference } from "@/hooks/use-dropi-connection-preference";
import { useDropeaConnectionPreference } from "@/hooks/use-dropea-connection-preference";
import { useStoreConnectionPreference } from "@/hooks/use-store-connection-preference";
import { getShopifyOauthStatus } from "@/lib/integrations/shopify/oauth.functions";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";
import { cn } from "@/lib/utils";

const connectionsRoute = getRouteApi("/connections");

export const Route = createFileRoute("/connections/")({
  head: () => ({
    meta: [{ title: metaT("meta.connectionsTitle") }],
  }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const t = useT();
  const { source } = connectionsRoute.useSearch();
  const store = useStoreConnectionPreference();
  const dropi = useDropiConnectionPreference();
  const dropea = useDropeaConnectionPreference();
  const shopifyOauth = useQuery({
    queryKey: ["connections", "shopify", "oauth"],
    queryFn: () => getShopifyOauthStatus(),
  });
  const shopifyLinked = store.linked || Boolean(shopifyOauth.data?.connected);

  return (
    <AppShell title={t("connections.title")} subtitle={t("connections.subtitle")}>
      <div className="space-y-4">
        <Link
          to="/connections/shopify"
          className="flex items-center justify-between gap-4 rounded-[16px] border border-[#E6E8EC] bg-white p-5 transition-colors hover:border-[#95BF47]/50 hover:bg-[#F3F8EC]/50"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center overflow-hidden rounded-[10px] border border-[#E6E8EC] bg-white">
              <img
                src={shopifyMark}
                alt=""
                width={28}
                height={28}
                className="size-7 object-contain"
              />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[#0A0C10]">
                {t("connections.shopifyStore")}
              </p>
              <p className="mt-0.5 text-[13px] text-[#667085]">{t("connections.shopifyHint")}</p>
              {source === "shopify" ? (
                <p className="mt-2 text-[12px] font-medium text-[#5E8E3E]">
                  {t("connections.selectedFromSetup")}
                </p>
              ) : null}
              {shopifyLinked && (shopifyOauth.data?.shopDomain ?? store.storeName) ? (
                <p className="mt-1 text-[12px] text-[#667085]">
                  {shopifyOauth.data?.shopDomain ?? store.storeDomain}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                shopifyLinked
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-[#E6E8EC] bg-[#F7F8FA] text-[#667085]",
              )}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  shopifyLinked ? "bg-emerald-500" : "bg-[#98A2B3]",
                )}
                aria-hidden
              />
              {shopifyLinked ? t("connections.linked") : t("connections.notConnected")}
            </span>
            <ArrowRight className="size-4 shrink-0 text-[#667085]" strokeWidth={1.75} />
          </div>
        </Link>

        <Link
          to="/connections/dropi"
          className="flex items-center justify-between gap-4 rounded-[16px] border border-[#E6E8EC] bg-white p-5 transition-colors hover:border-[#2563EB]/35 hover:bg-[#EFF6FF]/40"
        >
          <div className="flex items-start gap-3">
            <SupplyMark supply="dropi" size={40} className="rounded-[10px]" />
            <div>
              <p className="text-[15px] font-semibold text-[#0A0C10]">Dropi Pro</p>
              <p className="mt-0.5 text-[13px] text-[#667085]">{t("connections.dropiHint")}</p>
              {source === "dropi" ? (
                <p className="mt-2 text-[12px] font-medium text-[#2563EB]">
                  {t("connections.selectedFromSetup")}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                dropi.linked
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-[#E6E8EC] bg-[#F7F8FA] text-[#667085]",
              )}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  dropi.linked ? "bg-emerald-500" : "bg-[#98A2B3]",
                )}
                aria-hidden
              />
              {dropi.linked ? t("connections.connected") : t("connections.notConnected")}
            </span>
            <ArrowRight className="size-4 shrink-0 text-[#667085]" strokeWidth={1.75} />
          </div>
        </Link>

        <Link
          to="/connections/dropea"
          className="flex items-center justify-between gap-4 rounded-[16px] border border-[#E6E8EC] bg-white p-5 transition-colors hover:border-sky-300 hover:bg-sky-50/40"
        >
          <div className="flex items-start gap-3">
            <SupplyMark supply="dropea" size={40} className="rounded-[10px]" />
            <div>
              <p className="text-[15px] font-semibold text-[#0A0C10]">Dropea</p>
              <p className="mt-0.5 text-[13px] text-[#667085]">{t("connections.dropeaHint")}</p>
              {source === "dropea" ? (
                <p className="mt-2 text-[12px] font-medium text-sky-800">
                  {t("connections.selectedFromSetup")}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                dropea.linked
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-[#E6E8EC] bg-[#F7F8FA] text-[#667085]",
              )}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  dropea.linked ? "bg-emerald-500" : "bg-[#98A2B3]",
                )}
                aria-hidden
              />
              {dropea.linked ? t("connections.connected") : t("connections.notConnected")}
            </span>
            <ArrowRight className="size-4 shrink-0 text-[#667085]" strokeWidth={1.75} />
          </div>
        </Link>
      </div>
    </AppShell>
  );
}

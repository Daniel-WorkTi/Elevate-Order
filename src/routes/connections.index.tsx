import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { SupplyMark } from "@/components/supply-logo";
import shopifyMark from "@/assets/shopify-mark.png";
import { useDropiConnectionPreference } from "@/hooks/use-dropi-connection-preference";
import { useDropeaConnectionPreference } from "@/hooks/use-dropea-connection-preference";
import { useStoreConnectionPreference } from "@/hooks/use-store-connection-preference";
import { cn } from "@/lib/utils";

const connectionsRoute = getRouteApi("/connections");

export const Route = createFileRoute("/connections/")({
  head: () => ({
    meta: [{ title: "Connections — ELEVATE" }],
  }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const { source } = connectionsRoute.useSearch();
  const store = useStoreConnectionPreference();
  const dropi = useDropiConnectionPreference();
  const dropea = useDropeaConnectionPreference();

  return (
    <AppShell title="Connections" subtitle="Store, Dropi webhook and Dropea API">
      <div className="space-y-4">
        <Link
          to="/connections/shopify"
          className="flex items-center justify-between gap-4 rounded-[16px] border border-[#E6E8EC] bg-white p-5 transition-colors hover:border-[#95BF47]/50 hover:bg-[#F3F8EC]/50"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center overflow-hidden rounded-[10px] border border-[#E6E8EC] bg-white">
              <img src={shopifyMark} alt="" width={28} height={28} className="size-7 object-contain" />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[#0A0C10]">Shopify store</p>
              <p className="mt-0.5 text-[13px] text-[#667085]">
                Connect your shop to this workspace
              </p>
              {source === "shopify" ? (
                <p className="mt-2 text-[12px] font-medium text-[#5E8E3E]">Selected from setup</p>
              ) : null}
              {store.linked && store.storeName ? (
                <p className="mt-1 text-[12px] text-[#667085]">{store.storeDomain}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                store.linked
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-[#E6E8EC] bg-[#F7F8FA] text-[#667085]",
              )}
            >
              {store.linked ? "Linked" : "Not connected"}
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
              <p className="mt-0.5 text-[13px] text-[#667085]">
                Order update webhooks — supply account
              </p>
              {source === "dropi" ? (
                <p className="mt-2 text-[12px] font-medium text-[#2563EB]">Selected from setup</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                dropi.linked
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-[#E6E8EC] bg-[#F7F8FA] text-[#667085]",
              )}
            >
              {dropi.linked ? "Linked" : "Not connected"}
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
              <p className="mt-0.5 text-[13px] text-[#667085]">
                API token + HMAC — supply account
              </p>
              {source === "dropea" ? (
                <p className="mt-2 text-[12px] font-medium text-sky-800">Selected from setup</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                dropea.linked
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-[#E6E8EC] bg-[#F7F8FA] text-[#667085]",
              )}
            >
              {dropea.linked ? "Linked" : "Not connected"}
            </span>
            <ArrowRight className="size-4 shrink-0 text-[#667085]" strokeWidth={1.75} />
          </div>
        </Link>
      </div>
    </AppShell>
  );
}

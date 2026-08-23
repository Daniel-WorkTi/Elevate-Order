import { Check, RefreshCw, Activity, Unplug, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export type ConnectionCheck = {
  label: string;
  ok: boolean;
};

export function ConnectionSyncPanel({
  title,
  description,
  checks,
  refreshing,
  onRefresh,
  onTest,
  onDisconnect,
  onCheckConfiguration,
  refreshLabel,
  showRefresh = true,
}: {
  title: string;
  description: string;
  checks: ConnectionCheck[];
  refreshing: boolean;
  onRefresh: () => void;
  onTest?: () => void;
  onDisconnect?: () => void;
  onCheckConfiguration?: () => void;
  refreshLabel?: string;
  /** Hide for webhook supplies where "Sync now" is misleading. */
  showRefresh?: boolean;
}) {
  const t = useT();
  const resolvedRefreshLabel = refreshLabel ?? t("connections.refreshStatus");

  return (
    <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
      <h2 className="text-[15px] font-semibold text-[#0A0C10]">{title}</h2>
      <p className="mt-1 max-w-xl text-[13px] text-[#667085]">{description}</p>

      <ul className="mt-4 space-y-2">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-2 text-[13px]">
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full",
                check.ok ? "bg-emerald-50 text-emerald-700" : "bg-[#F2F4F7] text-[#667085]",
              )}
            >
              <Check className="size-3" strokeWidth={2} aria-hidden />
            </span>
            <span className={check.ok ? "text-[#0A0C10]" : "text-[#667085]"}>{check.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-2">
        {showRefresh ? (
          <Button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="h-9 rounded-[10px] bg-[#2563EB] text-[13px] shadow-none hover:bg-[#1D4ED8]"
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} strokeWidth={1.75} />
            {resolvedRefreshLabel}
          </Button>
        ) : null}
        {onTest ? (
        <Button
          type="button"
          variant={showRefresh ? "outline" : "default"}
          onClick={onTest}
          className={cn(
            "h-9 rounded-[10px] text-[13px] shadow-none",
            showRefresh
              ? "border-[#E6E8EC]"
              : "bg-[#2563EB] hover:bg-[#1D4ED8]",
          )}
        >
          <Activity className="size-3.5" strokeWidth={1.75} />
          {t("connections.testConnection")}
        </Button>
        ) : null}
        {onCheckConfiguration ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCheckConfiguration}
            className="h-9 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
          >
            <Settings className="size-3.5" strokeWidth={1.75} />
            {t("connections.checkConfiguration")}
          </Button>
        ) : null}
        {onDisconnect ? (
          <Button
            type="button"
            variant="outline"
            onClick={onDisconnect}
            className="h-9 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
          >
            <Unplug className="size-3.5" strokeWidth={1.75} />
            {t("connections.disconnect")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

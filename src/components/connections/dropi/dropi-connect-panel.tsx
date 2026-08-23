import { Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";

/** Operator-facing connect CTA — webhook URL lives in Advanced settings. */
export function DropiConnectPanel({
  serverReady,
  onConnect,
  onOpenAdvanced,
}: {
  serverReady: boolean;
  onConnect: () => void;
  onOpenAdvanced?: () => void;
}) {
  const t = useT();

  return (
    <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-[#0A0C10]">{t("connections.connectDropi")}</h2>
          <p className="mt-1 max-w-xl text-[13px] text-[#667085]">
            {t("connections.dropiConnectDesc")}
          </p>
          {!serverReady ? (
            <p className="mt-2 text-[12px] font-medium text-amber-700">
              {t("connections.serverNotReady")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {onOpenAdvanced ? (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenAdvanced}
              className="h-9 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
            >
              {t("connections.checkConfiguration")}
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={onConnect}
            disabled={!serverReady}
            className="h-9 rounded-[10px] bg-[#2563EB] text-[13px] shadow-none hover:bg-[#1D4ED8]"
          >
            <Link2 className="size-3.5" strokeWidth={1.75} />
            {t("connections.connectDropiCta")}
          </Button>
        </div>
      </div>
    </section>
  );
}

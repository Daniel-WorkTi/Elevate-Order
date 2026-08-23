import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { SupplyMark } from "@/components/supply-logo";
import {
  dropiStatusClass,
  dropiStatusDotClass,
  dropiStatusLabelKey,
} from "@/lib/integrations/dropi/dropi-format";
import type { DropiConnectionStatus } from "@/lib/integrations/dropi/dropi-types";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export function DropiHeader({ status }: { status: DropiConnectionStatus }) {
  const t = useT();

  return (
    <div className="space-y-3">
      <Link
        to="/connections"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#667085] hover:text-[#0A0C10]"
      >
        <ArrowLeft className="size-3.5" strokeWidth={1.75} />
        {t("connections.back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <SupplyMark supply="dropi" size={40} className="rounded-[10px]" />
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0A0C10]">Dropi Pro</h1>
            <p className="mt-1 text-[13px] text-[#667085]">{t("connections.webhookSync")}</p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
            dropiStatusClass(status),
          )}
        >
          <span
            className={cn("size-2 shrink-0 rounded-full", dropiStatusDotClass(status))}
            aria-hidden
          />
          {t(dropiStatusLabelKey(status))}
        </span>
      </div>
    </div>
  );
}

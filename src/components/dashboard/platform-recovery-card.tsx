import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { SupplyMark } from "@/components/supply-logo";
import { useI18n } from "@/lib/i18n/locale-context";
import { formatRecoveryRate, type PlatformRecovery } from "@/lib/inbox/aggregate-recovery";
import { formatMoney } from "@/lib/money/format-money";
import { SUPPLY_LABEL, type Supply } from "@/lib/order-domain";
import { cn } from "@/lib/utils";

function compactMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount >= 100 ? 0 : 2,
  }).format(amount);
}

function Metric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-[#667085]">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-[15px] font-semibold tabular-nums tracking-tight text-[#0A0C10]",
          valueClass,
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function PlatformRecoveryCard({
  platform,
  connected,
  hasData = true,
  currency,
}: {
  platform: PlatformRecovery;
  connected: boolean;
  hasData?: boolean;
  currency: string;
}) {
  const { t, locale } = useI18n();
  const numberLocale = locale === "pt" ? "pt-PT" : "en-US";
  const supply = platform.supply as Extract<Supply, "dropi" | "dropea">;
  const href = "/orders" as const;

  return (
    <Link
      to={href}
      search={{ supply }}
      className="block rounded-[16px] border border-[#E6E8EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:border-[#2563EB]/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SupplyMark supply={supply} size={40} className="rounded-[12px]" />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#0A0C10]">{SUPPLY_LABEL[supply]}</p>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-[#667085]">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  connected ? "bg-[#12B76A]" : "bg-[#D0D5DD]",
                )}
                aria-hidden
              />
              {connected
                ? hasData
                  ? t("connections.connected")
                  : t("connections.configured")
                : t("connections.notConnected")}
            </p>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-[#667085]" strokeWidth={1.75} />
      </div>

      <div className="mt-4 border-t border-[#E6E8EC] pt-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
          <Metric
            label={t("inbox.recovery.revenue")}
            value={
              hasData && connected
                ? compactMoney(platform.revenue, currency, locale)
                : "—"
            }
          />
          <Metric
            label={t("inbox.recovery.atRiskShort")}
            value={
              hasData && connected
                ? formatMoney(platform.atRisk, currency, numberLocale)
                : "—"
            }
            valueClass="text-[#F04438]"
          />
          <Metric
            label={t("inbox.recovery.recoveredShort")}
            value={
              hasData && connected
                ? formatMoney(platform.recovered, currency, numberLocale)
                : "—"
            }
            valueClass="text-[#12B76A]"
          />
          <Metric
            label={t("inbox.recovery.confirmedShort")}
            value={
              hasData && connected
                ? new Intl.NumberFormat(numberLocale).format(platform.confirmed)
                : "—"
            }
            valueClass="text-[#2563EB]"
          />
          <Metric
            label={t("inbox.recovery.rate")}
            value={
              hasData && connected ? formatRecoveryRate(platform.rate, numberLocale) : "—"
            }
          />
        </div>
      </div>
    </Link>
  );
}

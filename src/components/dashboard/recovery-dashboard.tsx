import { Link } from "@tanstack/react-router";
import { AlertTriangle, MessageCircle, RefreshCw, TrendingUp } from "lucide-react";

import { PlatformRecoveryCard } from "@/components/dashboard/platform-recovery-card";
import { RecoveredOrdersTable } from "@/components/dashboard/recovered-orders-table";
import { RecoveryKpiCard } from "@/components/dashboard/recovery-kpi-card";
import { RecoveryOverviewChart } from "@/components/dashboard/recovery-overview-chart";
import { useCurrencyPreference } from "@/hooks/use-currency-preference";
import { useEurRateTable } from "@/hooks/use-eur-rate-table";
import { formatRelativeTimestamp } from "@/lib/format-relative-time";
import { emptyRecoverySnapshot, type RecoverySnapshot } from "@/lib/inbox/aggregate-recovery";
import { useI18n } from "@/lib/i18n/locale-context";
import { formatMoney } from "@/lib/money/format-money";
import { cn } from "@/lib/utils";

const EMPTY_SNAPSHOT = emptyRecoverySnapshot();

export function RecoveryDashboard({
  snapshot = EMPTY_SNAPSHOT,
  periodLabel,
  connected,
  fetchedAt,
  refreshing,
  onRefresh,
}: {
  snapshot?: RecoverySnapshot;
  periodLabel: string;
  connected: { dropi: boolean; dropea: boolean };
  fetchedAt: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const { t, locale } = useI18n();
  const { displayCurrency } = useCurrencyPreference();
  const fx = useEurRateTable();
  const numberLocale = locale === "pt" ? "pt-PT" : "en-US";
  const updated = formatRelativeTimestamp(fetchedAt, { locale, t });

  function formatAmount(amount: number) {
    return formatMoney(amount, displayCurrency, numberLocale);
  }

  const dropi = snapshot.platforms.dropi;
  const dropea = snapshot.platforms.dropea;
  const chart = snapshot.chart;

  const hasData = snapshot.orderCount > 0;
  const anyLinked = connected.dropi || connected.dropea;

  return (
    <div className="space-y-5">
      {hasData ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <RecoveryKpiCard
            label={t("inbox.recovery.totalRevenue")}
            value={formatAmount(snapshot.revenue)}
            icon={TrendingUp}
            iconWrapClass="bg-[#EFF6FF]"
            iconClass="text-[#2563EB]"
          />
          <RecoveryKpiCard
            label={t("inbox.recovery.atRisk")}
            value={formatAmount(snapshot.atRisk)}
            icon={AlertTriangle}
            iconWrapClass="bg-[#FEF3F2]"
            iconClass="text-[#F04438]"
          />
          <RecoveryKpiCard
            label={t("inbox.recovery.recovered")}
            value={formatAmount(snapshot.recovered)}
            icon={TrendingUp}
            iconWrapClass="bg-[#ECFDF3]"
            iconClass="text-[#12B76A]"
          />
          <RecoveryKpiCard
            label={t("inbox.recovery.confirmed")}
            value={new Intl.NumberFormat(numberLocale).format(snapshot.confirmed)}
            icon={MessageCircle}
            iconWrapClass="bg-[#EEF2FF]"
            iconClass="text-[#4F46E5]"
          />
        </div>
      ) : (
        <div className="rounded-[16px] border border-[#E6E8EC] bg-white px-5 py-10 text-center">
          <p className="text-[15px] font-semibold tracking-tight text-[#0A0C10]">
            {t("inbox.recovery.emptyTitle")}
          </p>
          <p className="mx-auto mt-1 max-w-xl text-[13px] text-[#667085]">
            {anyLinked ? t("inbox.recovery.emptyHintLinked") : t("inbox.recovery.emptyHint")}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/connections"
              className="inline-flex h-9 items-center rounded-[10px] bg-[#2563EB] px-3 text-[13px] font-medium text-white hover:bg-[#1D4ED8]"
            >
              {t("inbox.recovery.viewConnections")}
            </Link>
            <Link
              to="/orders"
              className="inline-flex h-9 items-center rounded-[10px] border border-[#E6E8EC] bg-white px-3 text-[13px] font-medium text-[#0A0C10] hover:bg-[#F7F8FA]"
            >
              {t("inbox.recovery.viewOrders")}
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PlatformRecoveryCard
          platform={dropi}
          connected={connected.dropi}
          hasData={hasData}
          currency={displayCurrency}
        />
        <PlatformRecoveryCard
          platform={dropea}
          connected={connected.dropea}
          hasData={hasData}
          currency={displayCurrency}
        />
      </div>

      {hasData ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <RecoveryOverviewChart
            points={chart}
            currency={displayCurrency}
            periodLabel={periodLabel}
          />
          <RecoveredOrdersTable
            rows={snapshot.recent}
            displayCurrency={displayCurrency}
            rateMap={fx.rateMap}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1 text-[11px] text-[#667085] sm:flex-row sm:items-center sm:justify-between">
        <p>{t("inbox.recovery.timezone")}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 text-left hover:text-[#0A0C10]"
        >
          <RefreshCw
            className={cn("size-3", refreshing && "animate-spin")}
            strokeWidth={1.75}
            aria-hidden
          />
          {updated && updated.relative !== t("common.justNow")
            ? t("inbox.recovery.updated", { relative: updated.relative })
            : t("inbox.recovery.updatedJustNow")}
        </button>
      </div>
    </div>
  );
}

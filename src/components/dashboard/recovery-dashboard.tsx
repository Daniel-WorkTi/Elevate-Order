import { AlertTriangle, MessageCircle, RefreshCw, TrendingUp } from "lucide-react";

import { PlatformRecoveryCard } from "@/components/dashboard/platform-recovery-card";
import { RecoveredOrdersTable } from "@/components/dashboard/recovered-orders-table";
import { RecoveryKpiCard } from "@/components/dashboard/recovery-kpi-card";
import { RecoveryOverviewChart } from "@/components/dashboard/recovery-overview-chart";
import { useI18n } from "@/lib/i18n/locale-context";
import { emptyRecoverySnapshot, type RecoverySnapshot } from "@/lib/inbox/aggregate-recovery";
import { useCurrencyPreference } from "@/hooks/use-currency-preference";
import { useEurRateTable } from "@/hooks/use-eur-rate-table";
import { formatStoredAmount, convertStoredAmount } from "@/lib/currency/display-amount";
import { formatRelativeTimestamp } from "@/lib/format-relative-time";
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
  const currency = displayCurrency;
  const updated = formatRelativeTimestamp(fetchedAt, { locale, t });

  function fromEur(amount: number) {
    return convertStoredAmount(amount, "EUR", displayCurrency, fx.rateMap) ?? amount;
  }

  function displayFromEur(amount: number) {
    return formatStoredAmount(amount, "EUR", displayCurrency, fx.rateMap, numberLocale);
  }

  const dropi = {
    ...snapshot.platforms.dropi,
    revenue: fromEur(snapshot.platforms.dropi.revenue),
    atRisk: fromEur(snapshot.platforms.dropi.atRisk),
    recovered: fromEur(snapshot.platforms.dropi.recovered),
  };
  const dropea = {
    ...snapshot.platforms.dropea,
    revenue: fromEur(snapshot.platforms.dropea.revenue),
    atRisk: fromEur(snapshot.platforms.dropea.atRisk),
    recovered: fromEur(snapshot.platforms.dropea.recovered),
  };
  const chart = snapshot.chart.map((point) => ({
    ...point,
    recovered: fromEur(point.recovered),
    atRisk: fromEur(point.atRisk),
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RecoveryKpiCard
          label={t("inbox.recovery.totalRevenue")}
          value={displayFromEur(snapshot.revenue)}
          icon={TrendingUp}
          iconWrapClass="bg-[#EFF6FF]"
          iconClass="text-[#2563EB]"
        />
        <RecoveryKpiCard
          label={t("inbox.recovery.atRisk")}
          value={displayFromEur(snapshot.atRisk)}
          icon={AlertTriangle}
          iconWrapClass="bg-[#FEF3F2]"
          iconClass="text-[#F04438]"
        />
        <RecoveryKpiCard
          label={t("inbox.recovery.recovered")}
          value={displayFromEur(snapshot.recovered)}
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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PlatformRecoveryCard
          platform={dropi}
          connected={connected.dropi}
          currency={currency}
        />
        <PlatformRecoveryCard
          platform={dropea}
          connected={connected.dropea}
          currency={currency}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <RecoveryOverviewChart
          points={chart}
          currency={currency}
          periodLabel={periodLabel}
        />
        <RecoveredOrdersTable
          rows={snapshot.recent}
          displayCurrency={displayCurrency}
          rateMap={fx.rateMap}
        />
      </div>

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

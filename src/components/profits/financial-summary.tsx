import { Info } from "lucide-react";

import { useT } from "@/lib/i18n/locale-context";
import { formatMargin } from "@/lib/money/calculate-profit";
import { formatSummaryMoney, type FinancialSummary } from "@/lib/profits/aggregate";

export function FinancialSummaryPanel({
  summary,
  missingCostCount,
}: {
  summary: FinancialSummary;
  missingCostCount: number;
}) {
  const t = useT();

  return (
    <section className="rounded-[16px] border border-border bg-card">
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-5">
        <Metric
          label={t("profits.revenue")}
          value={formatSummaryMoney(summary.revenue, summary.currency)}
        />
        <Metric
          label={t("profits.knownCosts")}
          value={
            summary.costsAvailable
              ? formatSummaryMoney(summary.knownCosts, summary.currency)
              : "—"
          }
          {...(!summary.costsAvailable ? { hint: t("profits.notAvailable") } : {})}
        />
        <Metric
          label={t("profits.fees")}
          value={
            summary.feesAvailable ? formatSummaryMoney(summary.fees, summary.currency) : "—"
          }
          {...(!summary.feesAvailable ? { hint: t("profits.notAvailable") } : {})}
        />
        <Metric
          label={t("profits.profit")}
          value={
            summary.profitAvailable
              ? formatSummaryMoney(summary.profit, summary.currency)
              : t("profits.unavailable")
          }
          emphasize
        />
        <Metric
          label={t("profits.margin")}
          value={summary.profitAvailable ? formatMargin(summary.margin) : "—"}
        />
      </div>

      <div className="flex items-start gap-2 border-t border-border px-4 py-3 text-[12px] text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
        <div className="space-y-1">
          <p>{t("profits.summaryHint")}</p>
          {!summary.profitAvailable ? (
            <p>
              {t(missingCostCount === 1 ? "profits.missingCostsOne" : "profits.missingCosts", {
                count: missingCostCount,
              })}
            </p>
          ) : null}
          {summary.skippedRevenue > 0 ? (
            <p>
              {t(
                summary.skippedRevenue === 1 ? "profits.skippedRatesOne" : "profits.skippedRates",
                { count: summary.skippedRevenue },
              )}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  emphasize,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasize?: boolean;
}) {
  return (
    <div className="bg-card px-4 py-4">
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <p
        className={`mt-1.5 font-semibold tabular-nums tracking-tight ${
          emphasize ? "text-[20px] text-foreground" : "text-[18px] text-foreground"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

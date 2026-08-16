import { Info } from "lucide-react";

import { formatMargin } from "@/lib/money/calculate-profit";
import { formatSummaryMoney, type FinancialSummary } from "@/lib/profits/aggregate";

export function FinancialSummaryPanel({
  summary,
  missingCostCount,
}: {
  summary: FinancialSummary;
  missingCostCount: number;
}) {
  return (
    <section className="rounded-[16px] border border-border bg-card">
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-5">
        <Metric
          label="Revenue"
          value={formatSummaryMoney(summary.revenue, summary.currency)}
        />
        <Metric
          label="Known costs"
          value={
            summary.costsAvailable
              ? formatSummaryMoney(summary.knownCosts, summary.currency)
              : "—"
          }
          {...(!summary.costsAvailable ? { hint: "Not available" } : {})}
        />
        <Metric
          label="Fees"
          value={
            summary.feesAvailable ? formatSummaryMoney(summary.fees, summary.currency) : "—"
          }
          {...(!summary.feesAvailable ? { hint: "Not available" } : {})}
        />
        <Metric
          label="Profit"
          value={
            summary.profitAvailable
              ? formatSummaryMoney(summary.profit, summary.currency)
              : "Unavailable"
          }
          emphasize
        />
        <Metric
          label="Margin"
          value={summary.profitAvailable ? formatMargin(summary.margin) : "—"}
        />
      </div>

      <div className="flex items-start gap-2 border-t border-border px-4 py-3 text-[12px] text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
        <div className="space-y-1">
          <p>
            Profit is calculated only from synchronized financial data available for each supply.
          </p>
          {!summary.profitAvailable ? (
            <p>
              Cost data is missing for {missingCostCount} order
              {missingCostCount === 1 ? "" : "s"}. Known costs and fees are not present in the
              current sync schema.
            </p>
          ) : null}
          {summary.skippedRevenue > 0 ? (
            <p>
              {summary.skippedRevenue} order
              {summary.skippedRevenue === 1 ? "" : "s"} skipped due to missing exchange rates.
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

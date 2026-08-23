import { SupplyMark } from "@/components/supply-logo";
import { useT } from "@/lib/i18n/locale-context";
import { SUPPLY_LABEL } from "@/lib/order-domain";
import { formatMargin } from "@/lib/money/calculate-profit";
import { formatSummaryMoney, type SupplyBreakdownRow } from "@/lib/profits/aggregate";

export function SupplyBreakdown({
  rows,
  maxRevenue,
}: {
  rows: SupplyBreakdownRow[];
  maxRevenue: number;
}) {
  const t = useT();

  return (
    <section className="rounded-[16px] border border-border bg-card p-5">
      <h2 className="text-[15px] font-semibold text-foreground">{t("profits.supplyBreakdown")}</h2>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{t("profits.supplyBreakdownHint")}</p>

      <div className="mt-4 space-y-4">
        {rows.map((row) => {
          const width =
            row.revenue != null && maxRevenue > 0
              ? Math.max(4, Math.round((row.revenue / maxRevenue) * 100))
              : 0;
          return (
            <div key={row.supply} className="rounded-[12px] border border-border px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground">
                  <SupplyMark supply={row.supply} size={20} />
                  {SUPPLY_LABEL[row.supply]}
                </span>
                <span className="text-[12px] tabular-nums text-muted-foreground">
                  {t(row.orderCount === 1 ? "profits.ordersCountOne" : "profits.ordersCount", {
                    count: row.orderCount,
                  })}
                </span>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F7F8FA]">
                <div
                  className="h-full rounded-full bg-[color:var(--elevate-blue)]"
                  style={{ width: `${width}%` }}
                />
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
                <Stat
                  label={t("profits.revenue")}
                  value={formatSummaryMoney(row.revenue, row.currency)}
                />
                <Stat
                  label={t("profits.knownCosts")}
                  value={
                    row.costsAvailable
                      ? formatSummaryMoney(row.knownCosts, row.currency)
                      : "—"
                  }
                />
                <Stat
                  label={t("profits.profit")}
                  value={
                    row.profitAvailable
                      ? formatSummaryMoney(row.profit, row.currency)
                      : t("profits.unavailable")
                  }
                />
                <Stat
                  label={t("profits.margin")}
                  value={row.profitAvailable ? formatMargin(row.margin) : "—"}
                />
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

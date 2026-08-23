import { Link } from "@tanstack/react-router";

import { SupplyMark } from "@/components/supply-logo";
import { useI18n } from "@/lib/i18n/locale-context";
import { customerInitials, type RecoveredOrderRow } from "@/lib/inbox/aggregate-recovery";
import { formatStoredAmount } from "@/lib/currency/display-amount";
import { formatMoney } from "@/lib/money/format-money";
import { SUPPLY_LABEL } from "@/lib/order-domain";

export function RecoveredOrdersTable({
  rows,
  displayCurrency,
  rateMap,
}: {
  rows: RecoveredOrderRow[];
  displayCurrency?: string;
  rateMap?: Record<string, number>;
}) {
  const { t, locale } = useI18n();
  const numberLocale = locale === "pt" ? "pt-PT" : "en-US";

  return (
    <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight text-[#0A0C10]">
          {t("inbox.recovery.recent")}
        </h2>
        <Link
          to="/orders"
          className="text-[13px] font-medium text-[#2563EB] hover:text-[#1D4ED8]"
        >
          {t("inbox.recovery.viewAll")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-[#667085]">{t("inbox.recovery.emptyOrders")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="border-b border-[#E6E8EC] text-[11px] font-medium uppercase tracking-wide text-[#667085]">
                <th className="pb-2 pr-3 font-medium">{t("inbox.recovery.orderId")}</th>
                <th className="pb-2 pr-3 font-medium">{t("inbox.recovery.customer")}</th>
                <th className="pb-2 pr-3 font-medium">{t("inbox.recovery.origin")}</th>
                <th className="pb-2 text-right font-medium">{t("inbox.recovery.recoveredValue")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.supply}-${row.orderId}`} className="border-b border-[#E6E8EC] last:border-b-0">
                  <td className="py-3 pr-3 text-[13px] font-medium tabular-nums text-[#0A0C10]">
                    {row.displayId}
                  </td>
                  <td className="py-3 pr-3">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#EFF6FF] text-[10px] font-semibold text-[#2563EB]">
                        {customerInitials(row.customer)}
                      </span>
                      <span className="truncate text-[13px] text-[#0A0C10]">{row.customer}</span>
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#667085]">
                      <SupplyMark supply={row.supply} size={18} />
                      {SUPPLY_LABEL[row.supply]}
                    </span>
                  </td>
                  <td className="py-3 text-right text-[13px] font-semibold tabular-nums text-[#12B76A]">
                    {displayCurrency && rateMap
                      ? formatStoredAmount(
                          row.amount,
                          row.currency,
                          displayCurrency,
                          rateMap,
                          numberLocale,
                        )
                      : formatMoney(row.amount, row.currency, numberLocale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

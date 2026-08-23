import { Package } from "lucide-react";

import { useCurrencyPreference } from "@/hooks/use-currency-preference";
import { useEurRateTable } from "@/hooks/use-eur-rate-table";
import { formatOrderDisplayTotal } from "@/lib/currency/display-amount";
import { useT } from "@/lib/i18n/locale-context";
import {
  formatOrderTotal,
  getOrderCurrency,
  type OperationalOrder,
} from "@/lib/order-domain";

function productLines(summary: string | null): string[] {
  if (!summary?.trim() || summary.trim() === "—") return [];
  return summary
    .split(/\s*,\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function OrderItemsSection({ order }: { order: OperationalOrder }) {
  const t = useT();
  const currency = getOrderCurrency(order);
  const { displayCurrency } = useCurrencyPreference();
  const fx = useEurRateTable();
  const totalLabel = formatOrderTotal(order);
  const converted = formatOrderDisplayTotal(order, displayCurrency, fx.rateMap);
  const products = productLines(order.product_summary);

  return (
    <section aria-labelledby="order-heading" className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        <h2 id="order-heading" className="text-[15px] font-semibold text-foreground">
          {t("orders.detail.order")}
        </h2>
      </div>

      {products.length > 0 ? (
        <ul className="space-y-1.5 text-[14px] text-foreground">
          {products.map((product, index) => (
            <li key={`${product}-${index}`} className="flex items-start justify-between gap-3">
              <span className="min-w-0">{product}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted-foreground">{t("orders.detail.lineItemsHint")}</p>
      )}

      <dl className="space-y-2 text-[14px]">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">{t("orders.detail.total")}</dt>
          <dd className="text-right">
            <span className="text-[16px] font-semibold tracking-tight text-foreground">
              {totalLabel ?? "—"}
            </span>
            {converted ? (
              <span className="mt-0.5 block text-[12px] text-muted-foreground">
                ≈ {converted} {currency === displayCurrency ? "" : displayCurrency}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>
    </section>
  );
}

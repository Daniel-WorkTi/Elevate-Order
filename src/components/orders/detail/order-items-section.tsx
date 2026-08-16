import { Package } from "lucide-react";

import { useExchangeRate } from "@/components/app-shell/use-exchange-rate";
import {
  formatConvertedTotal,
  formatOrderTotal,
  getOrderCurrency,
  type OperationalOrder,
} from "@/lib/order-domain";

export function OrderItemsSection({ order }: { order: OperationalOrder }) {
  const currency = getOrderCurrency(order);
  const fx = useExchangeRate(currency, "BRL");
  const totalLabel = formatOrderTotal(order);
  const converted = formatConvertedTotal(order, "BRL", fx.rate);

  return (
    <section aria-labelledby="order-heading" className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        <h2 id="order-heading" className="text-[15px] font-semibold text-foreground">
          Order
        </h2>
      </div>

      <p className="text-[13px] text-muted-foreground">
        Line items are not included in the current sync payload. Showing the supply total when
        available.
      </p>

      <dl className="space-y-2 text-[14px]">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Total</dt>
          <dd className="text-right">
            <span className="text-[16px] font-semibold tracking-tight text-foreground">
              {totalLabel ? `${totalLabel} ${currency}` : "—"}
            </span>
            {converted ? (
              <span className="mt-0.5 block text-[12px] text-muted-foreground">≈ {converted}</span>
            ) : null}
          </dd>
        </div>
      </dl>
    </section>
  );
}

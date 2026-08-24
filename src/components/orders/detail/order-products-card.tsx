import { Package } from "lucide-react";

import { useCurrencyPreference } from "@/hooks/use-currency-preference";
import { useEurRateTable } from "@/hooks/use-eur-rate-table";
import { formatStoredAmount } from "@/lib/currency/display-amount";
import { useT } from "@/lib/i18n/locale-context";
import { formatMoney } from "@/lib/money/format-money";
import { getOrderCurrency, type OperationalOrder } from "@/lib/order-domain";
import {
  resolveOrderLineItems,
  type OrderLineItemView,
} from "@/lib/orders/order-line-items";

function MoneyCell({
  amount,
  currency,
  displayCurrency,
  rateMap,
}: {
  amount: number | null;
  currency: string;
  displayCurrency: string;
  rateMap: Record<string, number>;
}) {
  if (amount == null) return <span className="text-muted-foreground">—</span>;
  const original = formatMoney(amount, currency);
  const converted =
    currency !== displayCurrency
      ? formatStoredAmount(amount, currency, displayCurrency, rateMap)
      : null;

  return (
    <div className="text-right">
      <p className="text-[13px] font-medium text-[#0A0C10]">{original}</p>
      {converted ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">≈ {converted}</p>
      ) : null}
    </div>
  );
}

function ProductRow({
  item,
  currency,
  displayCurrency,
  rateMap,
}: {
  item: OrderLineItemView;
  currency: string;
  displayCurrency: string;
  rateMap: Record<string, number>;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[#E6E8EC] py-2.5 last:border-b-0 lg:grid-cols-[minmax(0,1.6fr)_56px_minmax(80px,1fr)_minmax(80px,1fr)] lg:items-center">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[#E6E8EC] bg-[#F7F8FA]">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <Package className="size-4 text-muted-foreground" strokeWidth={1.5} />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-[#0A0C10]">{item.title}</p>
          {item.variant ? (
            <p className="mt-0.5 truncate text-[12px] text-[#667085]">{item.variant}</p>
          ) : null}
          <p className="mt-1 text-[12px] text-muted-foreground lg:hidden">
            ×{item.quantity}
          </p>
        </div>
      </div>

      <p className="hidden text-center text-[13px] text-[#0A0C10] lg:block">{item.quantity}</p>

      <div className="hidden lg:block">
        <MoneyCell
          amount={item.unitPrice}
          currency={currency}
          displayCurrency={displayCurrency}
          rateMap={rateMap}
        />
      </div>

      <div className="justify-self-end lg:justify-self-stretch">
        <MoneyCell
          amount={item.lineTotal ?? item.unitPrice}
          currency={currency}
          displayCurrency={displayCurrency}
          rateMap={rateMap}
        />
      </div>
    </div>
  );
}

export function OrderProductsCard({ order }: { order: OperationalOrder }) {
  const t = useT();
  const currency = getOrderCurrency(order);
  const { displayCurrency } = useCurrencyPreference();
  const fx = useEurRateTable();
  const items =
    order.line_items && order.line_items.length > 0
      ? order.line_items
      : resolveOrderLineItems({
          productSummary: order.product_summary,
          total: order.total,
        });

  return (
    <section
      aria-labelledby="products-heading"
      className="rounded-[12px] border border-[#E6E8EC] bg-white p-5 shadow-none"
    >
      <div className="mb-2 flex items-center gap-2">
        <Package className="size-4 text-[#667085]" strokeWidth={1.5} aria-hidden />
        <h2 id="products-heading" className="text-[15px] font-semibold text-[#0A0C10]">
          {t("orders.detail.orderProducts")}
        </h2>
      </div>

      {items.length === 0 ? (
        <p className="text-[13px] text-[#667085]">{t("orders.detail.lineItemsHint")}</p>
      ) : (
        <>
          <div className="mb-0.5 hidden grid-cols-[minmax(0,1.6fr)_56px_minmax(80px,1fr)_minmax(80px,1fr)] gap-3 border-b border-[#E6E8EC] pb-2 text-[12px] text-[#667085] lg:grid">
            <span>{t("orders.detail.product")}</span>
            <span className="text-center">{t("orders.detail.qty")}</span>
            <span className="text-right">{t("orders.detail.unitPrice")}</span>
            <span className="text-right">{t("orders.detail.lineTotal")}</span>
          </div>
          <div>
            {items.map((item) => (
              <ProductRow
                key={item.id}
                item={item}
                currency={currency}
                displayCurrency={displayCurrency}
                rateMap={fx.rateMap}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

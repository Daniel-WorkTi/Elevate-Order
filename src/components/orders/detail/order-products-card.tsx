import { Package } from "lucide-react";
import { useMemo } from "react";

import { useExchangeRate } from "@/components/app-shell/use-exchange-rate";
import { OrderSoftCardChrome } from "@/components/orders/detail/order-soft-card-chrome";
import { useCurrencyPreference } from "@/hooks/use-currency-preference";
import { useEurRateTable } from "@/hooks/use-eur-rate-table";
import { convertStoredAmount } from "@/lib/currency/display-amount";
import { useT } from "@/lib/i18n/locale-context";
import { getOrderCurrency, type OperationalOrder } from "@/lib/order-domain";
import {
  resolveOrderLineItems,
  type OrderLineItemView,
} from "@/lib/orders/order-line-items";
import { cn } from "@/lib/utils";

/** Mock-style money: "45,49 PLN" / "63,43 R$" */
function formatDetailMoney(amount: number, currency: string): string {
  const n = new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  if (currency.toUpperCase() === "BRL") return `${n} R$`;
  return `${n} ${currency.toUpperCase()}`;
}

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
  const original = formatDetailMoney(amount, currency);
  const convertedValue =
    currency.toUpperCase() !== displayCurrency.toUpperCase()
      ? convertStoredAmount(amount, currency, displayCurrency, rateMap)
      : null;
  const converted =
    convertedValue != null ? formatDetailMoney(convertedValue, displayCurrency) : null;

  return (
    <div className="text-right">
      <p className="text-[13px] font-medium text-[#0A0C10]">{original}</p>
      {converted ? (
        <p className="mt-0.5 text-[11px] text-[#667085]">≈ {converted}</p>
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[#E6E8EC] py-3 last:border-b-0 lg:grid-cols-[minmax(0,1.6fr)_56px_minmax(80px,1fr)_minmax(80px,1fr)] lg:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA]">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <Package className="size-5 text-muted-foreground" strokeWidth={1.5} />
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

export function OrderProductsCard({
  order,
  className,
  softBottom = false,
}: {
  order: OperationalOrder;
  className?: string;
  /** Desktop stretch: fade into canvas; no bottom border. Content (title/rows) unchanged. */
  softBottom?: boolean;
}) {
  const t = useT();
  const currency = getOrderCurrency(order);
  const { displayCurrency, from, to } = useCurrencyPreference();
  const fx = useEurRateTable();
  /** Same source as the header switcher — fills BRL (etc.) when the EUR bulk table omits them. */
  const switcherPair = useExchangeRate(from, to);
  const orderPair = useExchangeRate(currency, displayCurrency);
  const eurToDisplay = useExchangeRate("EUR", displayCurrency);
  const eurToOrder = useExchangeRate("EUR", currency);

  const rateMap = useMemo(() => {
    const map: Record<string, number> = { ...fx.rateMap };
    const put = (a: string, b: string, rate: number | null | undefined) => {
      if (rate == null || !Number.isFinite(rate) || rate <= 0 || a === b) return;
      map[`${a}_${b}`] = rate;
      map[`${b}_${a}`] = 1 / rate;
    };
    put(from, to, switcherPair.rate);
    put(currency, displayCurrency, orderPair.rate);
    put("EUR", displayCurrency, eurToDisplay.rate);
    put("EUR", currency, eurToOrder.rate);
    return map;
  }, [
    fx.rateMap,
    switcherPair.rate,
    orderPair.rate,
    eurToDisplay.rate,
    eurToOrder.rate,
    from,
    to,
    currency,
    displayCurrency,
  ]);

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
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] bg-white p-5 shadow-none",
        softBottom
          ? "border-0 bg-gradient-to-b from-white from-[38%] via-white/75 via-[68%] to-[#F7F8FA] to-100%"
          : "border border-[#E6E8EC]",
        className,
      )}
    >
      {softBottom ? <OrderSoftCardChrome /> : null}

      <div className="relative z-[2] mb-2 flex shrink-0 items-center gap-2">
        <Package className="size-4 text-[#667085]" strokeWidth={1.5} aria-hidden />
        <h2 id="products-heading" className="text-[15px] font-semibold text-[#0A0C10]">
          {t("orders.detail.orderProducts")}
        </h2>
      </div>

      {items.length === 0 ? (
        <p className="relative z-[2] text-[13px] text-[#667085]">{t("orders.detail.lineItemsHint")}</p>
      ) : (
        <div className="relative z-[2] shrink-0">
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
                rateMap={rateMap}
              />
            ))}
          </div>
        </div>
      )}

      {/* Espaço flexível abaixo dos produtos — o fade visual vive aqui, sem cobrir preços */}
      {softBottom ? <div className="relative z-0 min-h-0 flex-1" aria-hidden /> : null}
    </section>
  );
}

import { Copy, ExternalLink, FileText } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCurrencyPreference } from "@/hooks/use-currency-preference";
import { useEurRateTable } from "@/hooks/use-eur-rate-table";
import { formatOrderDisplayTotal } from "@/lib/currency/display-amount";
import { useT } from "@/lib/i18n/locale-context";
import {
  formatOrderId,
  formatOrderTotal,
  getOrderSupply,
  SUPPLY_LABEL,
  type OperationalOrder,
} from "@/lib/order-domain";
import { cn } from "@/lib/utils";

function SummaryRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-[#E6E8EC] py-3 last:border-b-0",
        className,
      )}
    >
      <dt className="shrink-0 text-[13px] text-[#667085]">{label}</dt>
      <dd className="min-w-0 text-right text-[14px] font-medium text-[#0A0C10]">{children}</dd>
    </div>
  );
}

function CopyValue({ label, value }: { label: string; value: string }) {
  const t = useT();
  return (
    <div className="inline-flex items-center gap-1">
      <span className="font-mono text-[13px]">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 rounded-[8px] text-[#98A2B3]"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value.replace(/^#/, ""));
            toast.success(t("common.copiedLabel", { label }));
          } catch {
            toast.error(t("common.copyFailedLabel", { label: label.toLowerCase() }));
          }
        }}
        aria-label={t("common.copyLabel", { label })}
      >
        <Copy className="size-3.5" strokeWidth={1.5} />
      </Button>
    </div>
  );
}

export function OrderSummaryCard({
  order,
  storeName,
  storeUrl,
}: {
  order: OperationalOrder;
  storeName: string | null;
  storeUrl: string | null;
}) {
  const t = useT();
  const supply = getOrderSupply(order);
  const supplyLabel = supply ? SUPPLY_LABEL[supply] : order.source;
  const { displayCurrency } = useCurrencyPreference();
  const fx = useEurRateTable();
  const totalLabel = formatOrderTotal(order);
  const converted = formatOrderDisplayTotal(order, displayCurrency, fx.rateMap);
  const itemCount =
    order.line_items?.reduce((sum, item) => sum + item.quantity, 0) ??
    (order.product_summary?.trim() ? 1 : 0);

  const shopifyId =
    order.shopify_order_id != null ? `#${order.shopify_order_id}` : null;
  const supplyId = formatOrderId(order);

  return (
    <section
      aria-labelledby="summary-heading"
      className="rounded-[12px] border border-[#E6E8EC] bg-white p-5 shadow-none"
    >
      <div className="mb-3 flex items-center gap-2">
        <FileText className="size-4 text-[#667085]" strokeWidth={1.5} aria-hidden />
        <h2 id="summary-heading" className="text-[15px] font-semibold text-[#0A0C10]">
          {t("orders.detail.orderSummary")}
        </h2>
      </div>

      <dl>
        {shopifyId ? (
          <SummaryRow label={t("orders.detail.shopifyId")}>
            <CopyValue label={t("orders.detail.shopifyId")} value={shopifyId} />
          </SummaryRow>
        ) : null}

        <SummaryRow label={t("orders.detail.supplyId", { supply: supplyLabel })}>
          <CopyValue label={t("orders.detail.supplyId", { supply: supplyLabel })} value={supplyId} />
        </SummaryRow>

        {storeName ? (
          <SummaryRow label={t("orders.detail.store")}>
            {storeUrl ? (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[color:var(--elevate-blue)] hover:underline"
              >
                <span className="truncate">{storeName}</span>
                <ExternalLink className="size-3.5 shrink-0" strokeWidth={1.5} />
              </a>
            ) : (
              <span>{storeName}</span>
            )}
          </SummaryRow>
        ) : null}

        <SummaryRow label={t("orders.detail.total")} className="items-center">
          <div>
            <p className="text-[16px] font-semibold tracking-tight text-[#0A0C10]">
              {totalLabel ?? "—"}
            </p>
            {converted ? (
              <p className="mt-0.5 text-[12px] font-normal text-[#667085]">≈ {converted}</p>
            ) : null}
          </div>
        </SummaryRow>

        <SummaryRow label={t("orders.detail.products")}>
          {t("orders.detail.productsCount", { count: itemCount })}
        </SummaryRow>
      </dl>
    </section>
  );
}

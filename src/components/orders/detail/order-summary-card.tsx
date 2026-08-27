import { Copy, FileText } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { OrderSoftCardChrome } from "@/components/orders/detail/order-soft-card-chrome";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";
import {
  getOrderCurrency,
  getOrderSupply,
  SUPPLY_LABEL,
  type OperationalOrder,
} from "@/lib/order-domain";
import { cn } from "@/lib/utils";

function formatDetailTotal(order: Pick<OperationalOrder, "total" | "currency">): string | null {
  if (order.total == null || !Number.isFinite(order.total)) return null;
  const currency = getOrderCurrency(order);
  const n = new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(order.total);
  if (currency === "BRL") return `${n} R$`;
  return `${n} ${currency}`;
}

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
  softBottom = false,
  className,
}: {
  order: OperationalOrder;
  storeName: string | null;
  storeUrl: string | null;
  /** Same canvas fade as Products — bottom dissolves into #F7F8FA, no bottom border. */
  softBottom?: boolean;
  className?: string;
}) {
  const t = useT();
  const supply = getOrderSupply(order);
  const supplyLabel = supply ? SUPPLY_LABEL[supply] : order.source;
  const totalLabel = formatDetailTotal(order);
  const itemCount =
    order.line_items?.reduce((sum, item) => sum + item.quantity, 0) ??
    (order.product_summary?.trim() ? 1 : 0);

  const shopifyId =
    order.shopify_order_id != null ? `#${order.shopify_order_id}` : null;
  const supplyId =
    supply === "dropi"
      ? `DP${order.order_id}`
      : supply === "dropea"
        ? `DR${order.order_id}`
        : `#${order.order_id}`;

  return (
    <section
      aria-labelledby="summary-heading"
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden rounded-[14px] bg-white p-5 shadow-none",
        softBottom
          ? "border-0 bg-gradient-to-b from-white from-[38%] via-white/75 via-[68%] to-[#F7F8FA] to-100%"
          : "border border-[#E6E8EC]",
        className,
      )}
    >
      {softBottom ? <OrderSoftCardChrome /> : null}

      <div className="relative z-[2] mb-3 flex shrink-0 items-center gap-2">
        <FileText className="size-4 text-[#667085]" strokeWidth={1.5} aria-hidden />
        <h2 id="summary-heading" className="text-[15px] font-semibold text-[#0A0C10]">
          {t("orders.detail.orderSummary")}
        </h2>
      </div>

      <dl className="relative z-[2] shrink-0">
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
                className="text-[#0A0C10] hover:text-[color:var(--elevate-blue)] hover:underline"
              >
                {storeName}
              </a>
            ) : (
              <span>{storeName}</span>
            )}
          </SummaryRow>
        ) : null}

        <SummaryRow label={t("orders.detail.total")} className="items-center">
          <p className="text-[15px] font-semibold tracking-tight text-[#0A0C10]">
            {totalLabel ?? "—"}
          </p>
        </SummaryRow>

        <SummaryRow label={t("orders.detail.products")}>
          {t("orders.detail.productsCount", { count: itemCount })}
        </SummaryRow>
      </dl>

      {softBottom ? <div className="relative z-0 min-h-0 flex-1" aria-hidden /> : null}
    </section>
  );
}

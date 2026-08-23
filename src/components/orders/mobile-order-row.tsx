import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { CarrierIdentity } from "@/components/carriers/carrier-identity";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { formatOrderDisplayTotal } from "@/lib/currency/display-amount";
import { formatRelativeTimestamp } from "@/lib/format-relative-time";
import { useI18n } from "@/lib/i18n/locale-context";
import {
  formatOrderId,
  formatOrderTotal,
  safeTrackingHref,
  type OperationalOrder,
} from "@/lib/order-domain";

export function MobileOrderRow({
  order,
  fx,
}: {
  order: OperationalOrder;
  fx?: { to: string; rateMap: Record<string, number> } | undefined;
}) {
  const { locale, t } = useI18n();
  const total = formatOrderTotal(order);
  const converted = fx ? formatOrderDisplayTotal(order, fx.to, fx.rateMap) : null;
  const updated = formatRelativeTimestamp(order.last_event_at, { locale, t });
  const trackingHref = safeTrackingHref(order.tracking_url);
  const tracking = order.tracking_code?.trim() || null;

  return (
    <article className="rounded-[14px] border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold tracking-tight text-foreground">
            {formatOrderId(order)}
          </p>
          {order.shopify_order_id ? (
            <p className="text-[12px] text-muted-foreground">Shopify #{order.shopify_order_id}</p>
          ) : null}
        </div>
        <OrderStatusBadge order={order} />
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-[13px] text-foreground">{order.customer_name ?? "—"}</p>
        {order.country || order.phone ? (
          <p className="text-[12px] text-muted-foreground">{order.country ?? order.phone}</p>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold tabular-nums">{total ?? "—"}</p>
          {converted ? <p className="text-[11px] text-muted-foreground">≈ {converted}</p> : null}
        </div>
        {updated ? (
          <time
            className="text-[12px] text-muted-foreground"
            dateTime={order.last_event_at ?? undefined}
            title={updated.exact}
          >
            {updated.relative}
          </time>
        ) : (
          <span className="text-[12px] text-muted-foreground">—</span>
        )}
      </div>

      <p className="mt-2 text-[12px] text-muted-foreground">
        <CarrierIdentity
          carrier={order.shipping_company}
          size="sm"
          unknownLabel={t("carriers.noInfo")}
        />
        {tracking ? (
          <>
            {" · "}
            {trackingHref ? (
              <a
                href={trackingHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[12px] text-foreground underline-offset-2 hover:underline"
              >
                {tracking}
              </a>
            ) : (
              <span className="font-mono text-[12px] text-foreground">{tracking}</span>
            )}
          </>
        ) : (
          " · —"
        )}
      </p>

      <Link
        to="/orders/$id"
        params={{ id: String(order.order_id) }}
        className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[color:var(--elevate-blue)] hover:text-[color:var(--elevate-blue-hover)]"
      >
        {t("orders.open")}
        <ArrowRight className="size-3.5" strokeWidth={1.5} />
      </Link>
    </article>
  );
}

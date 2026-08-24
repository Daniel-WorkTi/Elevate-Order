import { Link } from "@tanstack/react-router";
import { ChevronLeft, ExternalLink, MessageSquare, Truck } from "lucide-react";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { formatOrderStamp } from "@/lib/i18n/date-locale";
import { useI18n } from "@/lib/i18n/locale-context";
import {
  formatPrimaryOrderId,
  getOrderSupply,
  safeTrackingHref,
  SUPPLY_LABEL,
  type OperationalOrder,
} from "@/lib/order-domain";

const btnOutline =
  "h-9 rounded-[10px] border-[#E6E8EC] bg-white px-3 text-[13px] font-medium text-[#0A0C10] shadow-none hover:bg-[#F7F8FA]";
const btnPrimary =
  "h-9 rounded-[10px] bg-[color:var(--elevate-blue)] px-3 text-[13px] font-medium text-white shadow-none hover:bg-[color:var(--elevate-blue-hover)]";

export function OrderDetailHeader({
  order,
  shopifyUrl,
  onSendMessage,
}: {
  order: OperationalOrder;
  shopifyUrl: string | null;
  onSendMessage: () => void;
}) {
  const { t, locale } = useI18n();
  const supply = getOrderSupply(order);
  const supplyLabel = supply ? SUPPLY_LABEL[supply] : order.source;
  const created = formatOrderStamp(order.created_at ?? order.last_event_at, locale);
  const trackingHref = safeTrackingHref(order.tracking_url);

  return (
    <header className="space-y-2.5">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" strokeWidth={1.5} aria-hidden />
        {t("orders.detail.back")}
      </Link>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0A0C10] md:text-[24px]">
              {t("orders.detail.orderTitle", { id: formatPrimaryOrderId(order).replace(/^#/, "") })}
            </h1>
            <OrderStatusBadge order={order} />
          </div>
          <p className="text-[13px] text-[#667085]">
            {supplyLabel}
            <span className="mx-1.5 text-[#D0D5DD]">•</span>
            {t("orders.detail.createdAt", { datetime: created })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3 lg:flex lg:shrink-0 lg:flex-wrap lg:justify-end">
          {trackingHref ? (
            <Button asChild className={btnPrimary}>
              <a href={trackingHref} target="_blank" rel="noopener noreferrer">
                <Truck className="size-3.5 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{t("orders.detail.trackOrder")}</span>
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              disabled
              title={t("orders.detail.trackingUnavailable")}
              className={`${btnPrimary} opacity-50`}
            >
              <Truck className="size-3.5 shrink-0" strokeWidth={1.5} />
              <span className="truncate">{t("orders.detail.trackOrder")}</span>
            </Button>
          )}

          {shopifyUrl ? (
            <Button asChild variant="outline" className={btnOutline}>
              <a href={shopifyUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{t("orders.detail.viewOnShopify")}</span>
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled
              title={t("orders.detail.shopifyUnavailable")}
              className={btnOutline}
            >
              <ExternalLink className="size-3.5 shrink-0" strokeWidth={1.5} />
              <span className="truncate">{t("orders.detail.viewOnShopify")}</span>
            </Button>
          )}

          <Button type="button" variant="outline" className={btnOutline} onClick={onSendMessage}>
            <MessageSquare className="size-3.5 shrink-0" strokeWidth={1.5} />
            <span className="truncate">{t("orders.detail.sendMessage")}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

import { Link } from "@tanstack/react-router";
import { ChevronLeft, MessageSquare, Truck } from "lucide-react";

import { ShopifyLogo } from "@/components/brands/shopify-logo";
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
import { cn } from "@/lib/utils";

const btnOutline =
  "h-9 rounded-[10px] border border-[#E6E8EC] bg-white px-3.5 text-[13px] font-medium text-[#0A0C10] shadow-none hover:bg-[#F7F8FA]";
const btnPrimary =
  "h-9 rounded-[10px] bg-[#2563EB] px-3.5 text-[13px] font-medium text-white shadow-none hover:bg-[#1D4ED8]";

/** Official Shopify bag mark in a round badge (brand asset — not a Lucide stand-in). */
function ShopifyRoundIcon({ muted = false }: { muted?: boolean }) {
  return (
    <span
      className={cn(
        "grid size-4 shrink-0 place-items-center overflow-hidden rounded-full border bg-white",
        muted ? "border-[#E6E8EC]" : "border-[#D8E8C0]",
      )}
      aria-hidden
    >
      <ShopifyLogo size={12} className={cn(muted && "opacity-50 grayscale")} />
    </span>
  );
}

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
    <header className="space-y-3">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-[#667085] transition-colors hover:text-[#0A0C10]"
      >
        <ChevronLeft className="size-3.5" strokeWidth={1.5} aria-hidden />
        {t("orders.detail.back")}
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
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

        <div className="flex w-full flex-col gap-2 min-[520px]:flex-row min-[520px]:flex-wrap lg:w-auto lg:justify-end">
          {trackingHref ? (
            <Button asChild className={btnPrimary}>
              <a href={trackingHref} target="_blank" rel="noopener noreferrer">
                <Truck className="size-3.5 shrink-0" strokeWidth={1.5} />
                {t("orders.detail.trackOrder")}
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
              {t("orders.detail.trackOrder")}
            </Button>
          )}

          {shopifyUrl ? (
            <Button asChild variant="outline" className={btnOutline}>
              <a href={shopifyUrl} target="_blank" rel="noopener noreferrer">
                <ShopifyRoundIcon />
                {t("orders.detail.viewOnShopify")}
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
              <ShopifyRoundIcon muted />
              {t("orders.detail.viewOnShopify")}
            </Button>
          )}

          <Button type="button" variant="outline" className={btnOutline} onClick={onSendMessage}>
            <MessageSquare className="size-3.5 shrink-0" strokeWidth={1.5} />
            {t("orders.detail.sendMessage")}
          </Button>
        </div>
      </div>
    </header>
  );
}

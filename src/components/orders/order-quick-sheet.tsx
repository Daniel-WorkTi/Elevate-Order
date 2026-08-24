import { ExternalLink, MessageCircle, Package, MapPin, User } from "lucide-react";

import { CarrierIdentity } from "@/components/carriers/carrier-identity";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useT } from "@/lib/i18n/locale-context";
import {
  formatOrderId,
  formatOrderTotal,
  safeTrackingHref,
  type OperationalOrder,
} from "@/lib/order-domain";
import {
  buildWhatsAppLink,
  normalizeWhatsAppPhone,
  pickDefaultTemplate,
  resolveOrderMessage,
  templatesForOrder,
} from "@/lib/order-message";

function locationLine(order: OperationalOrder): string | null {
  const parts = [
    order.address?.trim(),
    [order.postal_code?.trim(), order.city?.trim()].filter(Boolean).join(" "),
    order.country?.trim(),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function OrderQuickSheet({
  order,
  open,
  onOpenChange,
}: {
  order: OperationalOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  if (!order) return null;

  const total = formatOrderTotal(order);
  const location = locationLine(order);
  const trackingHref = safeTrackingHref(order.tracking_url);
  const tracking = order.tracking_code?.trim() || null;
  const product = order.product_summary?.trim() || null;
  const incident = order.details?.trim() || order.status_name?.trim() || null;
  const phone = normalizeWhatsAppPhone(order.phone);
  const templateId = pickDefaultTemplate(order);
  const template =
    templatesForOrder(order).find((item) => item.id === templateId) ??
    templatesForOrder(order)[0];
  const message = template ? resolveOrderMessage(template.body, order) : "";
  const waHref = phone ? buildWhatsAppLink(phone, message) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto border-[#E6E8EC] p-0 sm:max-w-[420px]"
      >
        <SheetHeader className="border-b border-[#E6E8EC] px-5 py-4 text-left">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <SheetTitle className="text-[16px] font-semibold tracking-tight text-[#0A0C10]">
                {formatOrderId(order)}
              </SheetTitle>
              <p className="mt-0.5 text-[12px] text-[#667085]">{order.source || "—"}</p>
            </div>
            <OrderStatusBadge order={order} />
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 px-5 py-5">
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#667085]">
              <Package className="size-3.5" strokeWidth={1.75} aria-hidden />
              {t("orders.detail.order")}
            </div>
            <p className="text-[14px] text-[#0A0C10]">{product || "—"}</p>
            <p className="text-[18px] font-semibold tabular-nums tracking-tight text-[#0A0C10]">
              {total ?? "—"}
            </p>
          </section>

          <section className="space-y-2 border-t border-[#E6E8EC] pt-5">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#667085]">
              <User className="size-3.5" strokeWidth={1.75} aria-hidden />
              {t("orders.detail.customer")}
            </div>
            <p className="text-[15px] font-medium text-[#0A0C10]">
              {order.customer_name?.trim() || "—"}
            </p>
            {order.phone?.trim() ? (
              <p className="text-[13px] text-[#667085]">{order.phone.trim()}</p>
            ) : null}
            {order.email?.trim() ? (
              <p className="truncate text-[13px] text-[#667085]">{order.email.trim()}</p>
            ) : null}
          </section>

          <section className="space-y-2 border-t border-[#E6E8EC] pt-5">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#667085]">
              <MapPin className="size-3.5" strokeWidth={1.75} aria-hidden />
              {t("orders.detail.address")}
            </div>
            <p className="text-[14px] leading-relaxed text-[#0A0C10]">{location || "—"}</p>
          </section>

          <section className="space-y-2 border-t border-[#E6E8EC] pt-5">
            <p className="text-[12px] font-medium text-[#667085]">{t("orders.detail.reason")}</p>
            <p className="text-[14px] leading-relaxed text-[#0A0C10]">{incident || "—"}</p>
          </section>

          <section className="space-y-2 border-t border-[#E6E8EC] pt-5">
            <p className="text-[12px] font-medium text-[#667085]">{t("orders.detail.carrier")}</p>
            <CarrierIdentity
              carrier={order.shipping_company}
              size="md"
              unknownLabel={t("carriers.noInfo")}
            />
            {tracking ? (
              <p className="font-mono text-[13px] text-[#0A0C10]">{tracking}</p>
            ) : null}
            {trackingHref ? (
              <Button asChild variant="outline" className="h-9 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none">
                <a href={trackingHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" strokeWidth={1.75} />
                  {t("orders.detail.openTracking")}
                </a>
              </Button>
            ) : null}
          </section>
        </div>

        <div className="sticky bottom-0 border-t border-[#E6E8EC] bg-white px-5 py-4">
          {waHref ? (
            <Button
              asChild
              className="h-11 w-full rounded-[10px] bg-whatsapp text-[14px] text-white shadow-none hover:bg-whatsapp/90"
            >
              <a href={waHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" strokeWidth={1.75} />
                {t("orders.detail.openWhatsApp")}
              </a>
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                type="button"
                disabled
                className="h-11 w-full rounded-[10px] bg-whatsapp text-[14px] text-white opacity-50 shadow-none"
              >
                <MessageCircle className="size-4" strokeWidth={1.75} />
                {t("orders.detail.openWhatsApp")}
              </Button>
              <p className="text-center text-[12px] text-[#667085]">
                {t("orders.detail.phoneUnavailable")}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

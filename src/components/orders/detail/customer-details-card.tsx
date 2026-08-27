import { CreditCard, ExternalLink, Hash, Mail, MapPin, Phone, Truck, User } from "lucide-react";
import type { ReactNode } from "react";

import { resolveOrderCarrier } from "@/lib/carriers";
import { useT } from "@/lib/i18n/locale-context";
import { safeTrackingHref, type OperationalOrder } from "@/lib/order-domain";
import { cn } from "@/lib/utils";

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#E6E8EC] py-3 last:border-b-0">
      <div className="flex shrink-0 items-center gap-2 text-[13px] text-[#667085]">
        <span className="shrink-0 text-[#98A2B3]">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="min-w-0 max-w-[65%] text-right text-[14px] font-medium leading-snug text-[#0A0C10]">
        {children}
      </div>
    </div>
  );
}

function CarrierLink({ href, name }: { href: string; name: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center justify-end gap-1 text-[14px] font-medium text-[#2563EB] hover:text-[#1D4ED8] hover:underline"
    >
      <span className="truncate">{name}</span>
      <ExternalLink className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
    </a>
  );
}

export function CustomerDetailsCard({ order }: { order: OperationalOrder }) {
  const t = useT();
  const name = order.customer_name?.trim();
  const phone = order.phone?.trim();
  const email = order.email?.trim();
  const country = order.country?.trim();
  const city = order.city?.trim();
  const postalCode = order.postal_code?.trim();
  const address = order.address?.trim();
  const payment = order.payment_method?.trim();
  const trackingCode = order.tracking_code?.trim() || null;
  const trackingHref = safeTrackingHref(order.tracking_url);
  const carrier = resolveOrderCarrier({
    shipping_company: order.shipping_company,
    tracking_url: order.tracking_url,
  });
  const hasCarrier = !carrier.missing && Boolean(carrier.name);
  const carrierHref = carrier.website ?? trackingHref;

  const addressText = [address, postalCode, city, country].filter(Boolean).join(", ");

  const hasAny = Boolean(
    name || phone || email || addressText || payment || hasCarrier || trackingHref || trackingCode,
  );

  return (
    <section
      aria-labelledby="customer-heading"
      className="rounded-[14px] border border-[#E6E8EC] bg-white p-5 shadow-none"
    >
      <div className="mb-3 flex items-center gap-2">
        <User className="size-4 text-[#667085]" strokeWidth={1.5} aria-hidden />
        <h2 id="customer-heading" className="text-[15px] font-semibold text-[#0A0C10]">
          {t("orders.detail.customerData")}
        </h2>
      </div>

      {!hasAny ? (
        <p className="text-[13px] text-[#667085]">{t("orders.detail.customerUnavailable")}</p>
      ) : (
        <div>
          {name ? (
            <DetailRow icon={<User className="size-3.5" strokeWidth={1.5} />} label={t("orders.detail.name")}>
              {name}
            </DetailRow>
          ) : null}
          {phone ? (
            <DetailRow icon={<Phone className="size-3.5" strokeWidth={1.5} />} label={t("orders.detail.phone")}>
              {phone}
            </DetailRow>
          ) : null}
          {email ? (
            <DetailRow icon={<Mail className="size-3.5" strokeWidth={1.5} />} label={t("orders.detail.email")}>
              {email}
            </DetailRow>
          ) : null}
          {addressText ? (
            <DetailRow
              icon={<MapPin className="size-3.5" strokeWidth={1.5} />}
              label={t("orders.detail.address")}
            >
              {addressText}
            </DetailRow>
          ) : null}
          {payment ? (
            <DetailRow
              icon={<CreditCard className="size-3.5" strokeWidth={1.5} />}
              label={t("orders.detail.paymentMethod")}
            >
              {payment}
            </DetailRow>
          ) : null}

          <DetailRow
            icon={<Truck className="size-3.5" strokeWidth={1.5} />}
            label={t("orders.detail.carrier")}
          >
            {hasCarrier && carrierHref ? (
              <CarrierLink href={carrierHref} name={carrier.name} />
            ) : hasCarrier ? (
              <span>{carrier.name}</span>
            ) : (
              <span className={cn("font-normal text-[#667085]")}>
                {t("orders.detail.carrierPending")}
              </span>
            )}
          </DetailRow>

          {trackingCode ? (
            <DetailRow
              icon={<Hash className="size-3.5" strokeWidth={1.5} />}
              label={t("orders.detail.trackingCode")}
            >
              <span className="font-mono text-[13px]">{trackingCode}</span>
            </DetailRow>
          ) : null}
        </div>
      )}
    </section>
  );
}

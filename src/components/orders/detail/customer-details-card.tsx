import { CreditCard, Mail, MapPin, Phone, User } from "lucide-react";
import type { ReactNode } from "react";

import { useT } from "@/lib/i18n/locale-context";
import type { OperationalOrder } from "@/lib/order-domain";
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
    <div
      className={cn(
        "grid grid-cols-[minmax(110px,150px)_minmax(0,1fr)] items-start gap-x-4 border-b border-[#E6E8EC] py-3 last:border-b-0",
      )}
    >
      <div className="flex items-center gap-2 text-[13px] text-[#667085]">
        <span className="shrink-0 text-[#98A2B3]">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="min-w-0 text-[14px] font-medium leading-snug text-[#0A0C10]">{children}</div>
    </div>
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

  const addressText = [
    address,
    [postalCode, city].filter(Boolean).join(" "),
    country,
  ]
    .filter(Boolean)
    .join(", ");

  const hasAny = Boolean(name || phone || email || addressText || payment);

  return (
    <section
      aria-labelledby="customer-heading"
      className="rounded-[12px] border border-[#E6E8EC] bg-white p-5 shadow-none"
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
        </div>
      )}
    </section>
  );
}

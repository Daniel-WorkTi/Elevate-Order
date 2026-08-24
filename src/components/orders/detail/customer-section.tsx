import { Copy, Mail, MapPin, Phone, User } from "lucide-react";
import { toast } from "sonner";

import { LanguageBadge } from "@/components/i18n/language-badge";
import { Button } from "@/components/ui/button";
import { languageFromCountry } from "@/lib/i18n/languages";
import { useT } from "@/lib/i18n/locale-context";
import type { OperationalOrder } from "@/lib/order-domain";

export function CustomerSection({ order }: { order: OperationalOrder }) {
  const t = useT();
  const name = order.customer_name?.trim();
  const phone = order.phone?.trim();
  const email = order.email?.trim();
  const country = order.country?.trim();
  const city = order.city?.trim();
  const postalCode = order.postal_code?.trim();
  const address = order.address?.trim();
  const location = [address, [postalCode, city].filter(Boolean).join(" "), country]
    .filter(Boolean)
    .join(", ");
  const hasAny = Boolean(name || phone || email || location);
  const phoneLabel = t("orders.detail.phone");
  const emailLabel = t("orders.detail.email");

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("common.copiedLabel", { label }));
    } catch {
      toast.error(t("common.copyFailedLabel", { label: label.toLowerCase() }));
    }
  }

  return (
    <section aria-labelledby="customer-heading" className="space-y-4">
      <div className="flex items-center gap-2">
        <User className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        <h2 id="customer-heading" className="text-[15px] font-semibold text-foreground">
          {t("orders.detail.customer")}
        </h2>
      </div>

      {!hasAny ? (
        <p className="text-[13px] text-muted-foreground">{t("orders.detail.customerUnavailable")}</p>
      ) : (
        <div className="space-y-3 text-[14px] text-foreground">
          {name ? (
            <p className="text-[16px] font-medium tracking-tight">{name}</p>
          ) : (
            <p className="text-[14px] text-muted-foreground">—</p>
          )}

          {phone ? (
            <div className="flex items-center gap-1.5">
              <Phone
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden
              />
              <span>{phone}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-[8px] text-muted-foreground"
                onClick={() => void copyText(phoneLabel, phone)}
                aria-label={t("common.copyLabel", { label: phoneLabel })}
              >
                <Copy className="size-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          ) : null}

          {email ? (
            <div className="flex items-center gap-1.5">
              <Mail
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="min-w-0 truncate">{email}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-[8px] text-muted-foreground"
                onClick={() => void copyText(emailLabel, email)}
                aria-label={t("common.copyLabel", { label: emailLabel })}
              >
                <Copy className="size-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          ) : null}

          {location ? (
            <div className="flex items-start gap-1.5 text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="text-foreground">{location}</span>
              <LanguageBadge language={languageFromCountry(country)} />
            </div>
          ) : (
            <LanguageBadge language={null} />
          )}
        </div>
      )}
    </section>
  );
}

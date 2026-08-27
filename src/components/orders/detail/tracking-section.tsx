import { ExternalLink, Truck } from "lucide-react";

import { CarrierIdentity } from "@/components/carriers/carrier-identity";
import { resolveOrderCarrier } from "@/lib/carriers";
import { useT } from "@/lib/i18n/locale-context";
import { safeTrackingHref, type OperationalOrder } from "@/lib/order-domain";

export function TrackingSection({ order }: { order: OperationalOrder }) {
  const t = useT();
  const carrier = resolveOrderCarrier({
    shipping_company: order.shipping_company,
    tracking_url: order.tracking_url,
  });
  const company = carrier.missing ? null : carrier.name;
  const code = order.tracking_code?.trim() || null;
  const href = safeTrackingHref(order.tracking_url);
  const website = carrier.website ?? null;

  return (
    <section aria-labelledby="tracking-heading" className="space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        <h2 id="tracking-heading" className="text-[15px] font-semibold text-foreground">
          {t("orders.detail.tracking")}
        </h2>
      </div>

      <dl className="space-y-3">
        <div>
          <dt className="text-[12px] text-muted-foreground">{t("orders.detail.carrier")}</dt>
          <dd className="mt-1 text-[14px] font-medium text-foreground">
            <CarrierIdentity
              carrier={company}
              size="md"
              unavailableLabel={t("orders.detail.carrierPending")}
              unknownLabel={t("carriers.noInfo")}
            />
          </dd>
        </div>

        {website ? (
          <div>
            <dt className="text-[12px] text-muted-foreground">{t("orders.detail.carrierWebsite")}</dt>
            <dd className="mt-1">
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--elevate-blue)] hover:underline"
              >
                {website.replace(/^https?:\/\/(www\.)?/, "")}
                <ExternalLink className="size-3.5" strokeWidth={1.5} aria-hidden />
              </a>
            </dd>
          </div>
        ) : null}

        <div>
          <dt className="text-[12px] text-muted-foreground">{t("orders.detail.trackingCode")}</dt>
          <dd className="mt-1 font-mono text-[13px] text-foreground">{code || "—"}</dd>
        </div>

        {href ? (
          <div>
            <dt className="sr-only">{t("orders.detail.trackingUrl")}</dt>
            <dd>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--elevate-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)] focus-visible:ring-offset-2"
              >
                {t("orders.detail.openTracking")}
                <ExternalLink className="size-3.5" strokeWidth={1.5} aria-hidden />
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

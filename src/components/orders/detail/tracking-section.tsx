import { ExternalLink, Truck } from "lucide-react";

import { safeTrackingHref, type OperationalOrder } from "@/lib/order-domain";

export function TrackingSection({ order }: { order: OperationalOrder }) {
  const company = order.shipping_company?.trim();
  const code = order.tracking_code?.trim();
  const href = safeTrackingHref(order.tracking_url);
  const empty = !company && !code && !href;

  return (
    <section aria-labelledby="tracking-heading" className="space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        <h2 id="tracking-heading" className="text-[15px] font-semibold text-foreground">
          Tracking
        </h2>
      </div>

      {empty ? (
        <p className="text-[13px] text-muted-foreground">Tracking is not available yet.</p>
      ) : (
        <div className="space-y-2 text-[14px]">
          {company ? <p className="font-medium text-foreground">{company}</p> : null}
          {code ? <p className="font-mono text-[13px] text-foreground">{code}</p> : null}
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--elevate-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)] focus-visible:ring-offset-2"
            >
              Open tracking
              <ExternalLink className="size-3.5" strokeWidth={1.5} aria-hidden />
            </a>
          ) : null}
        </div>
      )}
    </section>
  );
}

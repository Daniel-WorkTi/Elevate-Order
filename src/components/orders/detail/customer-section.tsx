import { Copy, MapPin, Phone, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { OperationalOrder } from "@/lib/order-domain";

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Unable to copy ${label.toLowerCase()}`);
  }
}

function CopyButton({ label, value }: { label: string; value: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 rounded-[8px] text-muted-foreground"
      onClick={() => void copyText(label, value)}
      aria-label={`Copy ${label}`}
    >
      <Copy className="size-3.5" strokeWidth={1.5} />
    </Button>
  );
}

export function CustomerSection({ order }: { order: OperationalOrder }) {
  const name = order.customer_name?.trim();
  const phone = order.phone?.trim();
  const country = order.country?.trim();
  const hasAny = Boolean(name || phone || country);

  return (
    <section aria-labelledby="customer-heading" className="space-y-4">
      <div className="flex items-center gap-2">
        <User className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        <h2 id="customer-heading" className="text-[15px] font-semibold text-foreground">
          Customer
        </h2>
      </div>

      {!hasAny ? (
        <p className="text-[13px] text-muted-foreground">
          Customer details are not available for this synchronized order yet.
        </p>
      ) : (
        <div className="space-y-3 text-[14px] text-foreground">
          {name ? (
            <p className="text-[16px] font-medium tracking-tight">{name}</p>
          ) : (
            <p className="text-[14px] text-muted-foreground">—</p>
          )}

          {phone ? (
            <div className="flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
              <span>{phone}</span>
              <CopyButton label="Phone" value={phone} />
            </div>
          ) : null}

          {country ? (
            <div className="flex items-start gap-1.5 text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              <span>{country}</span>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

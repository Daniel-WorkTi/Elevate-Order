import { useState } from "react";
import { Code2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDropiDateTime } from "@/lib/integrations/dropi/dropi-format";
import type { DropiWebhookEventRow } from "@/lib/integrations/dropi/dropi-types";

export function DropiEventDetail({
  event,
  open,
  onOpenChange,
}: {
  event: DropiWebhookEventRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setShowRaw(false);
        onOpenChange(next);
      }}
    >
      <SheetContent className="w-full border-[#E6E8EC] sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-[16px] font-semibold text-[#0A0C10]">Event detail</SheetTitle>
        </SheetHeader>

        {event ? (
          <div className="mt-6 space-y-4 text-[13px]">
            <DetailRow label="Event" value="order.updated" />
            <DetailRow label="Order" value={`#${event.orderId}`} />
            <DetailRow label="Received" value={formatDropiDateTime(event.eventDate)} />
            <DetailRow label="Status" value={event.statusName ?? "—"} />
            <DetailRow label="Details" value={event.details ?? "—"} />
            <DetailRow label="Tracking code" value={event.trackingCode ?? "—"} />
            <DetailRow
              label="Tracking URL"
              value={event.trackingUrl ?? "—"}
              mono={Boolean(event.trackingUrl)}
            />
            <DetailRow label="Shipping company" value={event.shippingCompany ?? "—"} />
            <DetailRow label="Result" value="Processed" />

            {event.rawJson ? (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRaw((v) => !v)}
                  className="h-9 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
                >
                  <Code2 className="size-3.5" strokeWidth={1.75} />
                  {showRaw ? "Hide raw payload" : "View raw payload"}
                </Button>
                {showRaw ? (
                  <pre className="mt-3 max-h-64 overflow-auto rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] p-3 font-mono text-[11px] text-[#0A0C10]">
                    {event.rawJson}
                  </pre>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[12px] text-[#667085]">{label}</p>
      <p
        className={
          mono
            ? "mt-0.5 break-all font-mono text-[12px] text-[#0A0C10]"
            : "mt-0.5 text-[14px] font-medium text-[#0A0C10]"
        }
      >
        {value}
      </p>
    </div>
  );
}

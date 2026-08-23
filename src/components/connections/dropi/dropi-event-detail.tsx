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
import { useI18n } from "@/lib/i18n/locale-context";

export function DropiEventDetail({
  event,
  open,
  onOpenChange,
}: {
  event: DropiWebhookEventRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { locale, t } = useI18n();
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
          <SheetTitle className="text-[16px] font-semibold text-[#0A0C10]">
            {t("connections.eventDetail")}
          </SheetTitle>
        </SheetHeader>

        {event ? (
          <div className="mt-6 space-y-4 text-[13px]">
            <DetailRow label={t("connections.event")} value="order.updated" />
            <DetailRow label={t("connections.order")} value={`#${event.orderId}`} />
            <DetailRow label={t("connections.received")} value={formatDropiDateTime(event.eventDate, locale)} />
            <DetailRow label={t("common.status")} value={event.statusName ?? "—"} />
            <DetailRow label={t("connections.details")} value={event.details ?? "—"} />
            <DetailRow label={t("connections.trackingCode")} value={event.trackingCode ?? "—"} />
            <DetailRow
              label={t("connections.trackingUrl")}
              value={event.trackingUrl ?? "—"}
              mono={Boolean(event.trackingUrl)}
            />
            <DetailRow
              label={t("connections.shippingCompany")}
              value={event.shippingCompany ?? "—"}
            />
            <DetailRow label={t("connections.result")} value={t("connections.processed")} />

            {event.rawJson ? (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRaw((v) => !v)}
                  className="h-9 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
                >
                  <Code2 className="size-3.5" strokeWidth={1.75} />
                  {showRaw ? t("connections.hideRawPayload") : t("connections.viewRawPayload")}
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

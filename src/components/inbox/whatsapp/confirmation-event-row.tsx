import { CheckCircle2 } from "lucide-react";

import { formatOrderStamp } from "@/lib/i18n/date-locale";
import { useI18n, useT } from "@/lib/i18n/locale-context";
import type { WhatsAppConfirmationTimelineEvent } from "@/lib/whatsapp/inbox.functions";
import { cn } from "@/lib/utils";

export function ConfirmationEventRow({
  event,
}: {
  event: WhatsAppConfirmationTimelineEvent;
}) {
  const t = useT();
  const { locale } = useI18n();
  const at = formatOrderStamp(event.createdAt, locale);
  const isAuto = event.source === "whatsapp_auto";

  const title = isAuto
    ? t("inbox.whatsapp.confirmationAutoTitle")
    : t("inbox.whatsapp.confirmationOperatorTitle");

  return (
    <div className="flex justify-center py-1">
      <div
        className={cn(
          "max-w-[min(100%,28rem)] rounded-[10px] border px-3 py-2.5 text-center",
          isAuto
            ? "border-emerald-200/80 bg-emerald-50/80"
            : "border-[#E6E8EC] bg-[#F7F8FA]",
        )}
      >
        <div className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-[#0A0C10]">
          <CheckCircle2
            className={cn("size-3.5 shrink-0", isAuto ? "text-emerald-600" : "text-[#2563EB]")}
            strokeWidth={1.75}
            aria-hidden
          />
          <span>{title}</span>
        </div>
        {event.customerReply ? (
          <p className="mt-1 text-[11px] leading-snug text-[#667085]">
            {t("inbox.whatsapp.confirmationCustomerReply", {
              reply: event.customerReply,
            })}
          </p>
        ) : null}
        <p className="mt-1 text-[10px] text-[#98A2B3]">{at}</p>
      </div>
    </div>
  );
}

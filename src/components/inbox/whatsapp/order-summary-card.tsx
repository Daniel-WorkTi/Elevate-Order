import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { useT } from "@/lib/i18n/locale-context";
import type { WhatsAppConversationListItem } from "@/lib/whatsapp/inbox.functions";

export function OrderSummaryCard({ conversation }: { conversation: WhatsAppConversationListItem }) {
  const t = useT();

  if (!conversation.orderLabel && !conversation.productSummary) {
    return null;
  }

  return (
    <div className="border-b border-[#E6E8EC] bg-[#FAFBFC] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {conversation.orderLabel ? (
            <p className="truncate text-[13px] font-semibold text-[#0A0C10]">
              {t("inbox.whatsapp.order", { order: conversation.orderLabel })}
            </p>
          ) : null}
          {conversation.productSummary ? (
            <p className="mt-0.5 truncate text-[12px] text-[#667085]">{conversation.productSummary}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {conversation.statusName || conversation.confirmedAt ? (
            <OrderStatusBadge
              order={{
                status_name: conversation.statusName,
                details: null,
                confirmed_at: conversation.confirmedAt,
              }}
            />
          ) : null}
          {conversation.orderTotalLabel ? (
            <p className="text-[14px] font-semibold tabular-nums text-[#0A0C10]">
              {conversation.orderTotalLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

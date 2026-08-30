import { Link } from "@tanstack/react-router";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { formatInboxPhone, inboxCustomerName } from "@/lib/inbox/inbox-display";
import { useT } from "@/lib/i18n/locale-context";
import type { WhatsAppConversationListItem } from "@/lib/whatsapp/inbox.functions";

export function OrderDetailsSidebar({
  conversation,
  className,
}: {
  conversation: WhatsAppConversationListItem | null;
  className?: string;
}) {
  const t = useT();

  if (!conversation) {
    return (
      <div className={className}>
        <p className="px-4 py-8 text-center text-[13px] text-[#98A2B3]">
          {t("inbox.whatsapp.selectConversation")}
        </p>
      </div>
    );
  }

  const name = inboxCustomerName(conversation);

  return (
    <div className={className}>
      <div className="space-y-6 p-4">
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#98A2B3]">
            {t("inbox.whatsapp.sidebar.order")}
          </h3>
          {conversation.orderLabel ? (
            <>
              <p className="mt-2 text-[18px] font-semibold text-[#0A0C10]">{conversation.orderLabel}</p>
              {conversation.statusName ? (
                <div className="mt-2">
                  <OrderStatusBadge
                    order={{
                      status_name: conversation.statusName,
                      details: null,
                      confirmed_at: conversation.confirmedAt,
                    }}
                  />
                </div>
              ) : null}
              {conversation.orderTotalLabel ? (
                <p className="mt-3 text-[22px] font-semibold tracking-tight text-[#0A0C10]">
                  {conversation.orderTotalLabel}
                </p>
              ) : null}
              {conversation.productSummary ? (
                <p className="mt-2 text-[13px] text-[#667085]">{conversation.productSummary}</p>
              ) : null}
              {conversation.orderNumericId ? (
                <Button
                  asChild
                  size="sm"
                  className="mt-4 h-9 w-full rounded-[10px] bg-[#2563EB] text-[13px] font-medium text-white shadow-none hover:bg-[#1D4ED8]"
                >
                  <Link to="/orders/$id" params={{ id: String(conversation.orderNumericId) }}>
                    {t("inbox.whatsapp.viewOrder")}
                  </Link>
                </Button>
              ) : null}
            </>
          ) : conversation.ambiguousOrderCount > 1 ? (
            <p className="mt-2 text-[13px] text-amber-700">
              {t("inbox.whatsapp.ambiguousOrders", { count: conversation.ambiguousOrderCount })}
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-[#667085]">{t("inbox.whatsapp.noOrderLinked")}</p>
          )}
        </section>

        <div className="h-px bg-[#E6E8EC]" />

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#98A2B3]">
            {t("inbox.whatsapp.sidebar.customer")}
          </h3>
          <p className="mt-2 text-[15px] font-semibold text-[#0A0C10]">{name}</p>
          <p className="mt-1 text-[13px] text-[#667085]">
            {formatInboxPhone(conversation.customerPhone)}
          </p>
        </section>
      </div>
    </div>
  );
}

import type { CodReplyIntent, OperationalOrder } from "@/lib/order-domain";
import { CodDropiOperationHint } from "@/components/orders/detail/cod-confirmation-panel";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

const STYLE: Record<CodReplyIntent, string> = {
  confirm: "bg-emerald-50 text-emerald-800",
  reject: "bg-red-50 text-red-800",
  needs_operator: "bg-amber-50 text-amber-800",
};

const LABEL: Record<CodReplyIntent, string> = {
  confirm: "orders.codReply.badgeYes",
  reject: "orders.codReply.badgeNo",
  needs_operator: "orders.codReply.badgeUnclear",
};

export function CodReplyBadge({
  intent,
  replyText,
  order,
  className,
}: {
  intent: CodReplyIntent | null | undefined;
  replyText?: string | null;
  order?: OperationalOrder;
  className?: string;
}) {
  const t = useT();

  if (!intent) {
    return (
      <span className={cn("text-[12px] text-[#98A2B3]", className)}>
        {t("orders.codReply.badgeNone")}
      </span>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <span
        className={cn(
          "inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-[12px] font-medium",
          STYLE[intent],
        )}
      >
        {t(LABEL[intent])}
      </span>
      {replyText?.trim() ? (
        <p className="mt-1 truncate text-[11px] text-[#667085]">&quot;{replyText.trim()}&quot;</p>
      ) : null}
      {order ? <CodDropiOperationHint order={order} className="mt-1" /> : null}
    </div>
  );
}

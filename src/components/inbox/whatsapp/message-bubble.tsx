import { CheckCheck, Trash2 } from "lucide-react";

import { formatMessageTime } from "@/lib/inbox/inbox-display";
import { useT } from "@/lib/i18n/locale-context";
import type { WhatsAppConversationMessage } from "@/lib/whatsapp/inbox.functions";
import { cn } from "@/lib/utils";

export function MessageBubble({
  message,
  locale,
  onDelete,
  deleting,
}: {
  message: WhatsAppConversationMessage;
  locale: string;
  onDelete?: (messageId: string) => void;
  deleting?: boolean;
}) {
  const t = useT();
  const outbound = message.direction === "outbound";
  const time = formatMessageTime(message.createdAt, locale);
  const showChecks =
    outbound &&
    (message.status === "sent" || message.status === "delivered" || message.status === "read");

  return (
    <div className={cn("group flex items-end gap-1.5", outbound ? "justify-end" : "justify-start")}>
      {onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(message.id)}
          disabled={deleting}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] text-[#98A2B3] opacity-0 transition-opacity hover:bg-[#FEE4E2] hover:text-[#B42318] group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 disabled:opacity-40",
            outbound ? "order-first" : "order-last",
          )}
          aria-label={t("inbox.whatsapp.deleteMessage")}
        >
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      ) : null}

      <div
        className={cn(
          "max-w-[min(65%,420px)] rounded-[14px] px-3.5 py-2.5 text-[13px] leading-relaxed",
          outbound ? "bg-[#2563EB] text-white" : "bg-[#F2F4F7] text-[#0A0C10]",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            outbound ? "text-white/75" : "text-[#98A2B3]",
          )}
        >
          <span>{time}</span>
          {showChecks ? <CheckCheck className="size-3.5" strokeWidth={1.75} /> : null}
        </div>
      </div>
    </div>
  );
}

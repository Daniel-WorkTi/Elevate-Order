import { CustomerAvatar } from "@/components/inbox/whatsapp/customer-avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { formatIsoRelative } from "@/lib/i18n/date-locale";
import { useI18n, useT } from "@/lib/i18n/locale-context";
import { inboxCustomerName } from "@/lib/inbox/inbox-display";
import type { WhatsAppConversationListItem } from "@/lib/whatsapp/inbox.functions";
import { cn } from "@/lib/utils";

function UnreadBadge({ count }: { count: number }) {
  const label = count > 99 ? "99+" : String(count);

  return (
    <span className="inline-flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-[#25D366] px-1.5 text-[12px] font-semibold leading-none text-white">
      {label}
    </span>
  );
}

function conversationSubtitle(item: WhatsAppConversationListItem, t: ReturnType<typeof useT>): string {
  if (item.lastMessagePreview?.trim()) {
    return item.lastMessagePreview.trim();
  }
  if (item.orderLabel) {
    return t("inbox.whatsapp.order", { order: item.orderLabel });
  }
  if (item.ambiguousOrderCount > 1) {
    return t("inbox.whatsapp.ambiguousOrders", { count: item.ambiguousOrderCount });
  }
  return t("inbox.whatsapp.noMessages");
}

export function ConversationListItem({
  item,
  active,
  selectionMode,
  checked,
  onSelect,
  onToggleChecked,
}: {
  item: WhatsAppConversationListItem;
  active: boolean;
  selectionMode?: boolean;
  checked?: boolean;
  onSelect: () => void;
  onToggleChecked?: () => void;
}) {
  const t = useT();
  const { locale } = useI18n();
  const name = inboxCustomerName(item);
  const hasUnread = item.unreadCount > 0;
  const subtitle = conversationSubtitle(item, t);

  function handleClick() {
    if (selectionMode) {
      onToggleChecked?.();
      return;
    }
    onSelect();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150",
        active && !selectionMode ? "bg-[#F0F2F5]" : "bg-white hover:bg-[#F5F6F6]",
        selectionMode && checked && "bg-[#EFF6FF] hover:bg-[#EFF6FF]",
      )}
    >
      {selectionMode ? (
        <Checkbox
          checked={checked ?? false}
          onCheckedChange={() => onToggleChecked?.()}
          onClick={(event) => event.stopPropagation()}
          className="size-[18px] rounded-[4px] border-[#D0D5DD] data-[state=checked]:border-[#2563EB] data-[state=checked]:bg-[#2563EB]"
          aria-label={name}
        />
      ) : null}

      <CustomerAvatar name={name} size={49} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p
            className={cn(
              "truncate text-[17px] leading-tight text-[#111B21]",
              hasUnread ? "font-semibold" : "font-normal",
            )}
          >
            {name}
          </p>
          {item.lastMessageAt ? (
            <span
              className={cn(
                "shrink-0 text-[12px] leading-none",
                hasUnread ? "font-medium text-[#25D366]" : "text-[#667781]",
              )}
            >
              {formatIsoRelative(item.lastMessageAt, locale)}
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex items-center gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-[14px] leading-snug",
              hasUnread ? "font-medium text-[#111B21]" : "text-[#667781]",
            )}
          >
            {item.orderLabel && item.lastMessagePreview ? (
              <>
                <span className="text-[#667781]">
                  {t("inbox.whatsapp.order", { order: item.orderLabel })}
                </span>
                <span className="text-[#667781]"> · </span>
                <span>{item.lastMessagePreview.trim()}</span>
              </>
            ) : (
              subtitle
            )}
          </p>
          {!selectionMode && hasUnread ? <UnreadBadge count={item.unreadCount} /> : null}
        </div>
      </div>
    </button>
  );
}

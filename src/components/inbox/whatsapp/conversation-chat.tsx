import { Link } from "@tanstack/react-router";
import { ArrowLeft, MoreHorizontal, PanelRight, Trash2 } from "lucide-react";

import { CustomerAvatar } from "@/components/inbox/whatsapp/customer-avatar";
import { MessageComposer } from "@/components/inbox/whatsapp/message-composer";
import { MessageTimeline } from "@/components/inbox/whatsapp/message-timeline";
import { OrderSummaryCard } from "@/components/inbox/whatsapp/order-summary-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatInboxPhone, inboxCustomerName } from "@/lib/inbox/inbox-display";
import { useT } from "@/lib/i18n/locale-context";
import type {
  WhatsAppConversationDetail,
  WhatsAppConversationListItem,
} from "@/lib/whatsapp/inbox.functions";

export function ConversationHeader({
  conversation,
  onBack,
  onOpenOrderPanel,
  showOrderPanelButton,
  onDeleteContact,
  deletingContact,
}: {
  conversation: WhatsAppConversationListItem;
  onBack?: () => void;
  onOpenOrderPanel?: () => void;
  showOrderPanelButton?: boolean;
  onDeleteContact?: () => void;
  deletingContact?: boolean;
}) {
  const t = useT();
  const name = inboxCustomerName(conversation);

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-[#E6E8EC] px-4 py-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] text-[#667085] hover:bg-[#F7F8FA] lg:hidden"
          aria-label={t("inbox.whatsapp.back")}
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </button>
      ) : null}

      <CustomerAvatar name={name} size={36} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-[#0A0C10]">{name}</p>
        <p className="truncate text-[12px] text-[#667085]">
          {formatInboxPhone(conversation.customerPhone)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {conversation.orderNumericId ? (
          <Button
            asChild
            size="sm"
            className="h-8 rounded-[8px] bg-[#2563EB] px-3 text-[12px] font-medium text-white shadow-none hover:bg-[#1D4ED8]"
          >
            <Link to="/orders/$id" params={{ id: String(conversation.orderNumericId) }}>
              {t("inbox.whatsapp.viewOrder")}
            </Link>
          </Button>
        ) : null}
        {onDeleteContact ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={deletingContact}
                className="inline-flex size-8 items-center justify-center rounded-[8px] text-[#667085] hover:bg-[#F7F8FA] disabled:opacity-50"
                aria-label={t("inbox.whatsapp.conversationActions")}
              >
                <MoreHorizontal className="size-4" strokeWidth={1.75} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-[10px] border-[#E6E8EC]">
              <DropdownMenuItem
                className="cursor-pointer text-[13px] text-[#B42318] focus:bg-[#FEF3F2] focus:text-[#B42318]"
                onSelect={() => onDeleteContact()}
              >
                <Trash2 className="mr-2 size-3.5" strokeWidth={1.75} />
                {t("inbox.whatsapp.deleteContact")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {showOrderPanelButton && onOpenOrderPanel ? (
          <button
            type="button"
            onClick={onOpenOrderPanel}
            className="inline-flex size-8 items-center justify-center rounded-[8px] text-[#667085] hover:bg-[#F7F8FA] xl:hidden"
            aria-label={t("inbox.whatsapp.openOrderPanel")}
          >
            <PanelRight className="size-4" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ConversationChat({
  detail,
  loading,
  draft,
  sending,
  onDraftChange,
  onSend,
  onBack,
  onOpenOrderPanel,
  showOrderPanelButton,
  onDeleteMessage,
  deletingMessageId,
  onDeleteContact,
  deletingContact,
  pendingDeleteMessageId,
  onConfirmDeleteMessage,
  onCancelDeleteMessage,
}: {
  detail: WhatsAppConversationDetail | null | undefined;
  loading: boolean;
  draft: string;
  sending: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onBack?: () => void;
  onOpenOrderPanel?: () => void;
  showOrderPanelButton?: boolean;
  onDeleteMessage?: (messageId: string) => void;
  deletingMessageId?: string | null;
  onDeleteContact?: () => void;
  deletingContact?: boolean;
  pendingDeleteMessageId?: string | null;
  onConfirmDeleteMessage?: () => void;
  onCancelDeleteMessage?: () => void;
}) {
  const t = useT();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-[#667085]">{t("inbox.loadingQueue")}</p>
      </div>
    );
  }

  if (!detail?.conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-[#667085]">{t("inbox.loadError")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ConversationHeader
        conversation={detail.conversation}
        {...(onBack ? { onBack } : {})}
        {...(onOpenOrderPanel ? { onOpenOrderPanel } : {})}
        {...(showOrderPanelButton ? { showOrderPanelButton } : {})}
        {...(onDeleteContact ? { onDeleteContact, deletingContact } : {})}
      />
      <OrderSummaryCard conversation={detail.conversation} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <MessageTimeline
          timeline={detail.timeline}
          {...(onDeleteMessage ? { onDeleteMessage } : {})}
          {...(deletingMessageId !== undefined ? { deletingMessageId } : {})}
        />
      </div>
      <MessageComposer
        draft={draft}
        sending={sending}
        onDraftChange={onDraftChange}
        onSend={onSend}
      />

      <AlertDialog
        open={Boolean(pendingDeleteMessageId)}
        onOpenChange={(open) => {
          if (!open) onCancelDeleteMessage?.();
        }}
      >
        <AlertDialogContent className="rounded-[14px] border-[#E6E8EC]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] text-[#0A0C10]">
              {t("inbox.whatsapp.deleteMessageTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-[#667085]">
              {t("inbox.whatsapp.deleteMessageDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[10px] border-[#E6E8EC]">
              {t("inbox.whatsapp.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[10px] bg-[#B42318] hover:bg-[#912018]"
              onClick={(event) => {
                event.preventDefault();
                onConfirmDeleteMessage?.();
              }}
            >
              {t("inbox.whatsapp.deleteMessageConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

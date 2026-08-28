import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { supabase } from "@/integrations/supabase/client";
import { formatIsoRelative } from "@/lib/i18n/date-locale";
import { useI18n, useT } from "@/lib/i18n/locale-context";
import {
  getWhatsAppConversation,
  queryWhatsAppConversations,
  sendWhatsAppInboxMessage,
  type WhatsAppConversationListItem,
} from "@/lib/whatsapp/inbox.functions";
import { cn } from "@/lib/utils";

function displayName(item: WhatsAppConversationListItem): string {
  if (item.customerName?.trim()) return item.customerName.trim();
  return item.customerPhone;
}

function ConversationListItem({
  item,
  active,
  onSelect,
}: {
  item: WhatsAppConversationListItem;
  active: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  const { locale } = useI18n();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-[12px] border px-3 py-3 text-left transition-colors",
        active
          ? "border-[#2563EB]/30 bg-[#EFF6FF]"
          : "border-transparent bg-white hover:border-[#E6E8EC] hover:bg-[#F7F8FA]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-[#0A0C10]">{displayName(item)}</p>
          {item.orderLabel ? (
            <p className="mt-0.5 text-[12px] text-[#667085]">
              {t("inbox.whatsapp.order", { order: item.orderLabel })}
            </p>
          ) : item.ambiguousOrderCount > 1 ? (
            <p className="mt-0.5 text-[12px] text-amber-700">
              {t("inbox.whatsapp.ambiguousOrders", { count: item.ambiguousOrderCount })}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {item.lastMessageAt ? (
            <span className="text-[11px] text-[#98A2B3]">
              {formatIsoRelative(item.lastMessageAt, locale)}
            </span>
          ) : null}
          {item.unreadCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2563EB] px-1.5 text-[11px] font-semibold text-white">
              {item.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
      {item.lastMessagePreview ? (
        <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-[#667085]">
          {item.lastMessagePreview}
        </p>
      ) : null}
    </button>
  );
}

function ConversationThread({
  conversationId,
  workspaceId,
  onBack,
}: {
  conversationId: string;
  workspaceId: string;
  onBack?: () => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [clientMessageId, setClientMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const detailQuery = useQuery({
    queryKey: ["whatsapp", "conversation", workspaceId, conversationId],
    queryFn: () =>
      getWhatsAppConversation({
        data: { workspaceId, conversationId },
      }),
    enabled: Boolean(workspaceId && conversationId),
  });

  const sendMutation = useMutation({
    mutationFn: sendWhatsAppInboxMessage,
    onSuccess: async () => {
      setDraft("");
      await queryClient.invalidateQueries({
        queryKey: ["whatsapp", "conversation", workspaceId, conversationId],
      });
      await queryClient.invalidateQueries({ queryKey: ["whatsapp", "conversations", workspaceId] });
      toast.success(t("orders.detail.messageSent"));
    },
    onError: () => {
      toast.error(t("orders.detail.messageSendFailed"));
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detailQuery.data?.messages.length]);

  const conv = detailQuery.data?.conversation;
  const messages = detailQuery.data?.messages ?? [];

  function handleSend() {
    if (!draft.trim() || sendMutation.isPending) return;
    const id = clientMessageId ?? crypto.randomUUID();
    if (!clientMessageId) setClientMessageId(id);
    sendMutation.mutate({
      data: { workspaceId, conversationId, clientMessageId: id, text: draft.trim() },
    });
  }

  if (detailQuery.isPending) {
    return (
      <div className="flex h-full items-center justify-center rounded-[14px] border border-[#E6E8EC] bg-white">
        <p className="text-[13px] text-[#667085]">{t("inbox.loadingQueue")}</p>
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="flex h-full items-center justify-center rounded-[14px] border border-[#E6E8EC] bg-white">
        <p className="text-[13px] text-[#667085]">{t("inbox.loadError")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[520px] flex-col rounded-[14px] border border-[#E6E8EC] bg-white">
      <div className="flex items-center gap-3 border-b border-[#E6E8EC] px-4 py-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex size-8 items-center justify-center rounded-[8px] text-[#667085] hover:bg-[#F7F8FA] lg:hidden"
            aria-label={t("inbox.whatsapp.back")}
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} />
          </button>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-[#0A0C10]">{displayName(conv)}</p>
          <p className="truncate text-[12px] text-[#667085]">
            {conv.orderLabel
              ? t("inbox.whatsapp.threadSubtitleOrder", { order: conv.orderLabel })
              : conv.customerPhone}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => {
          const outbound = message.direction === "outbound";
          return (
            <div
              key={message.id}
              className={cn("flex", outbound ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-[12px] px-3 py-2 text-[13px] leading-relaxed",
                  outbound
                    ? "bg-[#2563EB] text-white"
                    : "border border-[#E6E8EC] bg-[#F7F8FA] text-[#0A0C10]",
                )}
              >
                {message.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[#E6E8EC] p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            disabled={sendMutation.isPending}
            placeholder={t("inbox.whatsapp.replyPlaceholder")}
            className="min-h-[44px] resize-none rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
          />
          <Button
            type="button"
            disabled={!draft.trim() || sendMutation.isPending}
            onClick={handleSend}
            className="h-10 shrink-0 rounded-[10px] bg-[#2563EB] px-3 text-white hover:bg-[#1D4ED8]"
          >
            <Send className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function WhatsAppInboxPanel() {
  const t = useT();
  const { workspaceId } = useWorkspaceId();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["whatsapp", "conversations", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => queryWhatsAppConversations({ data: { workspaceId: workspaceId! } }),
  });

  const conversations = useMemo(
    () => listQuery.data?.conversations ?? [],
    [listQuery.data?.conversations],
  );
  const totalUnread = useMemo(
    () => conversations.reduce((sum, item) => sum + item.unreadCount, 0),
    [conversations],
  );

  useEffect(() => {
    if (!workspaceId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const invalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void queryClient.invalidateQueries({
          queryKey: ["whatsapp", "conversations", workspaceId],
        });
        if (selectedId) {
          void queryClient.invalidateQueries({
            queryKey: ["whatsapp", "conversation", workspaceId, selectedId],
          });
        }
      }, 600);
    };

    const channel = supabase
      .channel(`whatsapp-inbox-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_conversations",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        invalidate,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient, selectedId]);

  useEffect(() => {
    if (!selectedId && conversations[0]?.id) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  if (!workspaceId) {
    return (
      <p className="text-[13px] text-[#667085]">{t("connections.whatsappWorkspaceRequired")}</p>
    );
  }

  if (listQuery.isPending) {
    return (
      <div className="rounded-[14px] border border-[#E6E8EC] bg-white py-16 text-center">
        <p className="text-[14px] font-medium text-[#0A0C10]">{t("inbox.loadingQueue")}</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-[14px] border border-[#E6E8EC] bg-white py-16 text-center">
        <p className="text-[14px] font-medium text-[#0A0C10]">{t("inbox.whatsapp.emptyTitle")}</p>
        <p className="mt-1 text-[13px] text-[#667085]">{t("inbox.whatsapp.emptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[#0A0C10]">
            {t("inbox.whatsapp.title")}
          </h2>
          <p className="mt-0.5 text-[13px] text-[#667085]">{t("inbox.whatsapp.subtitle")}</p>
        </div>
        {totalUnread > 0 ? (
          <span className="inline-flex h-7 items-center rounded-full border border-[#2563EB]/20 bg-[#EFF6FF] px-3 text-[12px] font-semibold text-[#2563EB]">
            {t("inbox.whatsapp.unreadBadge", { count: totalUnread })}
          </span>
        ) : null}
      </div>

      <div className="grid min-h-[560px] grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div
          className={cn(
            "space-y-2 rounded-[14px] border border-[#E6E8EC] bg-[#F7F8FA] p-2",
            selectedId ? "hidden lg:block" : "block",
          )}
        >
          {conversations.map((item) => (
            <ConversationListItem
              key={item.id}
              item={item}
              active={item.id === selectedId}
              onSelect={() => setSelectedId(item.id)}
            />
          ))}
        </div>

        <div className={cn("min-h-[520px]", selectedId ? "block" : "hidden lg:block")}>
          {selectedId ? (
            <ConversationThread
              conversationId={selectedId}
              workspaceId={workspaceId}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-[14px] border border-[#E6E8EC] bg-white">
              <p className="text-[13px] text-[#667085]">{t("inbox.whatsapp.selectConversation")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

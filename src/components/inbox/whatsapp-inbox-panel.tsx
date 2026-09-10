import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConversationChat } from "@/components/inbox/whatsapp/conversation-chat";
import { ConversationList } from "@/components/inbox/whatsapp/conversation-list";
import { InboxFilters } from "@/components/inbox/whatsapp/inbox-filters";
import { InboxHeader } from "@/components/inbox/whatsapp/inbox-header";
import { OrderDetailsSidebar } from "@/components/inbox/whatsapp/order-details-sidebar";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import {
  filterInboxConversations,
  inboxFilterCounts,
  searchInboxConversations,
  type InboxFilterId,
} from "@/lib/inbox/inbox-display";
import { useT } from "@/lib/i18n/locale-context";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteWhatsAppInboxConversations,
  deleteWhatsAppInboxMessage,
  getWhatsAppConversation,
  queryWhatsAppConversations,
  sendWhatsAppInboxMessage,
} from "@/lib/whatsapp/inbox.functions";
import { cn } from "@/lib/utils";

export function WhatsAppInboxPanel() {
  const t = useT();
  const { workspaceId } = useWorkspaceId();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [filter, setFilter] = useState<InboxFilterId>("all");
  const [draft, setDraft] = useState("");
  const [clientMessageId, setClientMessageId] = useState<string | null>(null);
  const [orderPanelOpen, setOrderPanelOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [pendingDeleteMessageId, setPendingDeleteMessageId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [pendingDeleteContactIds, setPendingDeleteContactIds] = useState<string[] | null>(null);

  const listQuery = useQuery({
    queryKey: ["whatsapp", "conversations", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => queryWhatsAppConversations({ data: { workspaceId: workspaceId! } }),
    retry: 1,
  });

  const allConversations = useMemo(
    () => listQuery.data?.conversations ?? [],
    [listQuery.data?.conversations],
  );

  const filterCounts = useMemo(() => inboxFilterCounts(allConversations), [allConversations]);

  const visibleConversations = useMemo(() => {
    const filtered = filterInboxConversations(allConversations, filter);
    return searchInboxConversations(filtered, search);
  }, [allConversations, filter, search]);

  const selectedListItem = useMemo(
    () =>
      visibleConversations.find((c) => c.id === selectedId) ??
      allConversations.find((c) => c.id === selectedId) ??
      null,
    [visibleConversations, allConversations, selectedId],
  );

  const detailQuery = useQuery({
    queryKey: ["whatsapp", "conversation", workspaceId, selectedId],
    queryFn: () =>
      getWhatsAppConversation({
        data: { workspaceId: workspaceId!, conversationId: selectedId! },
      }),
    enabled: Boolean(workspaceId && selectedId),
  });

  const sendMutation = useMutation({
    mutationFn: sendWhatsAppInboxMessage,
    onSuccess: async () => {
      setDraft("");
      setClientMessageId(null);
      await queryClient.invalidateQueries({
        queryKey: ["whatsapp", "conversation", workspaceId, selectedId],
      });
      await queryClient.invalidateQueries({ queryKey: ["whatsapp", "conversations", workspaceId] });
      toast.success(t("orders.detail.messageSent"));
    },
    onError: () => {
      toast.error(t("orders.detail.messageSendFailed"));
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: deleteWhatsAppInboxMessage,
    onSuccess: async () => {
      setPendingDeleteMessageId(null);
      await queryClient.invalidateQueries({
        queryKey: ["whatsapp", "conversation", workspaceId, selectedId],
      });
      await queryClient.invalidateQueries({ queryKey: ["whatsapp", "conversations", workspaceId] });
      toast.success(t("inbox.whatsapp.deleteMessageSuccess"));
    },
    onError: () => {
      toast.error(t("inbox.whatsapp.deleteMessageFailed"));
    },
  });

  const deleteContactsMutation = useMutation({
    mutationFn: (input: { data: { workspaceId: string; conversationIds: string[] } }) =>
      deleteWhatsAppInboxConversations(input),
    onSuccess: async (result, variables) => {
      const deletedIds = variables.data.conversationIds;
      const deleted = result.deletedCount;
      setPendingDeleteContactIds(null);
      setSelectionMode(false);
      setSelectedIds(new Set());

      if (selectedId && deletedIds.includes(selectedId)) {
        setSelectedId(null);
        setMobileView("list");
      }

      await queryClient.invalidateQueries({ queryKey: ["whatsapp", "conversations", workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["whatsapp", "conversation", workspaceId] });

      toast.success(
        deleted > 1
          ? t("inbox.whatsapp.deleteContactsSuccess", { count: deleted })
          : t("inbox.whatsapp.deleteContactSuccess"),
      );
    },
    onError: () => {
      toast.error(t("inbox.whatsapp.deleteContactFailed"));
    },
  });

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
        { event: "*", schema: "public", table: "whatsapp_messages", filter: `workspace_id=eq.${workspaceId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversations", filter: `workspace_id=eq.${workspaceId}` },
        invalidate,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient, selectedId]);

  useEffect(() => {
    if (selectionMode) return;
    if (!selectedId && visibleConversations[0]?.id) {
      setSelectedId(visibleConversations[0].id);
    }
  }, [visibleConversations, selectedId, selectionMode]);

  function handleSelectConversation(id: string) {
    if (selectionMode) return;
    setSelectedId(id);
    setMobileView("chat");
  }

  function handleSend() {
    if (!draft.trim() || !selectedId || !workspaceId || sendMutation.isPending) return;
    const id = clientMessageId ?? crypto.randomUUID();
    if (!clientMessageId) setClientMessageId(id);
    sendMutation.mutate({
      data: { workspaceId, conversationId: selectedId, clientMessageId: id, text: draft.trim() },
    });
  }

  function handleConfirmDeleteMessage() {
    if (!pendingDeleteMessageId || !selectedId || !workspaceId || deleteMessageMutation.isPending) {
      return;
    }
    deleteMessageMutation.mutate({
      data: {
        workspaceId,
        conversationId: selectedId,
        messageId: pendingDeleteMessageId,
      },
    });
  }

  function requestDeleteContacts(ids: string[]) {
    if (ids.length === 0) return;
    setPendingDeleteContactIds(ids);
  }

  function handleConfirmDeleteContacts() {
    if (!pendingDeleteContactIds?.length || !workspaceId || deleteContactsMutation.isPending) return;
    deleteContactsMutation.mutate({
      data: { workspaceId, conversationIds: pendingDeleteContactIds },
    });
  }

  function handleToggleSelectionMode() {
    setSelectionMode(true);
    setSelectedIds(new Set());
  }

  function handleCancelSelection() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function handleToggleItemChecked(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleSelectAll() {
    const visibleIds = visibleConversations.map((item) => item.id);
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleIds));
  }

  if (!workspaceId) {
    return (
      <p className="px-4 py-8 text-[13px] text-[#667085]">{t("connections.whatsappWorkspaceRequired")}</p>
    );
  }

  if (listQuery.isPending) {
    return (
      <div className="flex min-h-[480px] items-center justify-center rounded-[14px] border border-[#E6E8EC] bg-white">
        <p className="text-[14px] text-[#667085]">{t("inbox.loadingQueue")}</p>
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center rounded-[14px] border border-[#E6E8EC] bg-white px-6 text-center">
        <p className="text-[14px] font-medium text-[#0A0C10]">{t("inbox.loadError")}</p>
        <p className="mt-1 text-[13px] text-[#667085]">{t("inbox.whatsapp.retryHint")}</p>
      </div>
    );
  }

  if (allConversations.length === 0) {
    return (
      <div className="overflow-hidden rounded-[14px] border border-[#E6E8EC] bg-white">
        <InboxHeader search={search} onSearchChange={setSearch} />
        <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-[14px] font-medium text-[#0A0C10]">{t("inbox.whatsapp.emptyTitle")}</p>
          <p className="mt-1 text-[13px] text-[#667085]">{t("inbox.whatsapp.emptyHint")}</p>
        </div>
      </div>
    );
  }

  const activeConversation = detailQuery.data?.conversation ?? selectedListItem;
  const pendingDeleteCount = pendingDeleteContactIds?.length ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#E6E8EC] bg-white">
      <InboxHeader search={search} onSearchChange={setSearch} />
      <InboxFilters active={filter} counts={filterCounts} onChange={setFilter} />

      <div className="flex min-h-[min(720px,calc(100dvh-11rem))] flex-1">
        <aside
          className={cn(
            "w-full shrink-0 border-r border-[#E6E8EC] lg:w-[300px] xl:w-[320px]",
            mobileView === "chat" && !selectionMode ? "hidden lg:flex lg:flex-col" : "flex flex-col",
          )}
        >
          <ConversationList
            items={visibleConversations}
            selectedId={selectedId}
            listSearch={listSearch}
            onListSearchChange={setListSearch}
            onSelect={handleSelectConversation}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelectionMode={handleToggleSelectionMode}
            onCancelSelection={handleCancelSelection}
            onToggleItemChecked={handleToggleItemChecked}
            onToggleSelectAll={handleToggleSelectAll}
            onDeleteSelected={() => requestDeleteContacts([...selectedIds])}
            deleting={deleteContactsMutation.isPending}
          />
        </aside>

        <main
          className={cn(
            "min-w-0 flex-1 bg-[#FAFBFC]",
            mobileView === "list" || selectionMode ? "hidden lg:flex lg:flex-col" : "flex flex-col",
            !selectedId && "hidden lg:flex lg:flex-col",
          )}
        >
          {selectedId && !selectionMode ? (
            <ConversationChat
              detail={detailQuery.data}
              loading={detailQuery.isPending}
              draft={draft}
              sending={sendMutation.isPending}
              onDraftChange={setDraft}
              onSend={handleSend}
              onBack={() => setMobileView("list")}
              onOpenOrderPanel={() => setOrderPanelOpen(true)}
              showOrderPanelButton
              onDeleteMessage={setPendingDeleteMessageId}
              deletingMessageId={deleteMessageMutation.isPending ? pendingDeleteMessageId : null}
              onDeleteContact={() => selectedId && requestDeleteContacts([selectedId])}
              deletingContact={deleteContactsMutation.isPending}
              pendingDeleteMessageId={pendingDeleteMessageId}
              onConfirmDeleteMessage={handleConfirmDeleteMessage}
              onCancelDeleteMessage={() => setPendingDeleteMessageId(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-[13px] text-[#667085]">
                {selectionMode
                  ? t("inbox.whatsapp.selectContactsHint")
                  : t("inbox.whatsapp.selectConversation")}
              </p>
            </div>
          )}
        </main>

        <aside className="hidden w-[240px] shrink-0 border-l border-[#E6E8EC] xl:block">
          <OrderDetailsSidebar conversation={activeConversation} className="h-full overflow-y-auto" />
        </aside>
      </div>

      <Sheet open={orderPanelOpen} onOpenChange={setOrderPanelOpen}>
        <SheetContent side="right" className="w-[300px] p-0 sm:max-w-[300px]">
          <SheetHeader className="border-b border-[#E6E8EC] px-4 py-3 text-left">
            <SheetTitle className="text-[14px] font-semibold">{t("inbox.whatsapp.sidebar.order")}</SheetTitle>
          </SheetHeader>
          <OrderDetailsSidebar conversation={activeConversation} />
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={pendingDeleteCount > 0}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteContactIds(null);
        }}
      >
        <AlertDialogContent className="rounded-[14px] border-[#E6E8EC]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] text-[#0A0C10]">
              {pendingDeleteCount > 1
                ? t("inbox.whatsapp.deleteContactsTitle")
                : t("inbox.whatsapp.deleteContactTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-[#667085]">
              {pendingDeleteCount > 1
                ? t("inbox.whatsapp.deleteContactsDescription", { count: pendingDeleteCount })
                : t("inbox.whatsapp.deleteContactDescription")}
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
                handleConfirmDeleteContacts();
              }}
            >
              {t("inbox.whatsapp.deleteContactConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

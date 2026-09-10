import { Search } from "lucide-react";

import { ConversationListItem } from "@/components/inbox/whatsapp/conversation-list-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/locale-context";
import type { WhatsAppConversationListItem } from "@/lib/whatsapp/inbox.functions";
import { cn } from "@/lib/utils";

export function ConversationList({
  items,
  selectedId,
  listSearch,
  onListSearchChange,
  onSelect,
  selectionMode,
  selectedIds,
  onToggleSelectionMode,
  onCancelSelection,
  onToggleItemChecked,
  onToggleSelectAll,
  onDeleteSelected,
  deleting,
}: {
  items: WhatsAppConversationListItem[];
  selectedId: string | null;
  listSearch: string;
  onListSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelectionMode?: () => void;
  onCancelSelection?: () => void;
  onToggleItemChecked?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onDeleteSelected?: () => void;
  deleting?: boolean;
}) {
  const t = useT();

  const filtered = listSearch.trim()
    ? items.filter((item) => {
        const q = listSearch.trim().toLowerCase();
        const haystack = [
          item.customerName,
          item.customerPhone,
          item.orderLabel,
          item.lastMessagePreview,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
    : items;

  const selectedCount = selectedIds?.size ?? 0;
  const allVisibleSelected =
    filtered.length > 0 && filtered.every((item) => selectedIds?.has(item.id));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[#E6E8EC] p-3">
        {selectionMode ? (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onCancelSelection}
              className="text-[13px] font-medium text-[#2563EB] hover:text-[#1D4ED8]"
            >
              {t("inbox.whatsapp.cancelSelection")}
            </button>
            <p className="truncate text-[13px] font-medium text-[#0A0C10]">
              {t("inbox.whatsapp.selectedCount", { count: selectedCount })}
            </p>
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="text-[13px] font-medium text-[#2563EB] hover:text-[#1D4ED8]"
            >
              {allVisibleSelected ? t("inbox.whatsapp.deselectAll") : t("inbox.whatsapp.selectAll")}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#98A2B3]"
                strokeWidth={1.75}
              />
              <Input
                value={listSearch}
                onChange={(e) => onListSearchChange(e.target.value)}
                placeholder={t("inbox.whatsapp.searchConversations")}
                className="h-8 rounded-[8px] border-[#E6E8EC] bg-[#F7F8FA] pl-8 text-[12px] shadow-none"
              />
            </div>
            {onToggleSelectionMode ? (
              <button
                type="button"
                onClick={onToggleSelectionMode}
                className="shrink-0 text-[12px] font-medium text-[#2563EB] hover:text-[#1D4ED8]"
              >
                {t("inbox.whatsapp.selectContacts")}
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-[#98A2B3]">
            {t("inbox.whatsapp.noSearchResults")}
          </p>
        ) : (
          <div className="divide-y divide-[#E9EDEF]">
            {filtered.map((item) => (
              <ConversationListItem
                key={item.id}
                item={item}
                active={item.id === selectedId}
                {...(selectionMode !== undefined ? { selectionMode } : {})}
                {...(selectedIds ? { checked: selectedIds.has(item.id) } : {})}
                onSelect={() => onSelect(item.id)}
                {...(onToggleItemChecked
                  ? { onToggleChecked: () => onToggleItemChecked(item.id) }
                  : {})}
              />
            ))}
          </div>
        )}
      </div>

      {selectionMode ? (
        <div
          className={cn(
            "shrink-0 border-t border-[#E6E8EC] bg-white p-3",
            selectedCount === 0 && "opacity-60",
          )}
        >
          <Button
            type="button"
            disabled={selectedCount === 0 || deleting}
            onClick={onDeleteSelected}
            className="h-9 w-full rounded-[10px] bg-[#B42318] text-[13px] font-medium text-white hover:bg-[#912018]"
          >
            {t("inbox.whatsapp.deleteSelected", { count: selectedCount })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

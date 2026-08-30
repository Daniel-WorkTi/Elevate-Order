import { getOrderStatus, type OrderStatusKey } from "@/lib/order-domain";
import type { WhatsAppConversationListItem } from "@/lib/whatsapp/inbox.functions";

export type InboxFilterId = "all" | "unread" | "to_confirm" | "incidents";

export function inboxCustomerName(item: WhatsAppConversationListItem): string {
  if (item.customerName?.trim()) return item.customerName.trim();
  return item.customerPhone;
}

export function inboxInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/** Display E.164 with spacing — e.g. +351 931 815 886 */
export function formatInboxPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.startsWith("351") && digits.length >= 12) {
    return `+351 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  if (e164.startsWith("+")) return e164;
  return `+${digits}`;
}

export function inboxOrderStatusKey(item: WhatsAppConversationListItem): OrderStatusKey | null {
  if (!item.statusName && !item.confirmedAt) return null;
  return getOrderStatus({
    status_name: item.statusName,
    details: null,
    confirmed_at: item.confirmedAt,
  }).key;
}

export function filterInboxConversations(
  items: WhatsAppConversationListItem[],
  filter: InboxFilterId,
): WhatsAppConversationListItem[] {
  switch (filter) {
    case "unread":
      return items.filter((item) => item.unreadCount > 0);
    case "to_confirm":
      return items.filter((item) => inboxOrderStatusKey(item) === "waiting");
    case "incidents":
      return items.filter((item) => inboxOrderStatusKey(item) === "incident");
    default:
      return items;
  }
}

export function searchInboxConversations(
  items: WhatsAppConversationListItem[],
  query: string,
): WhatsAppConversationListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items.filter((item) => {
    const haystack = [
      item.customerName,
      item.customerPhone,
      item.orderLabel,
      item.orderNumericId != null ? String(item.orderNumericId) : null,
      item.productSummary,
      item.lastMessagePreview,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function inboxFilterCounts(
  items: WhatsAppConversationListItem[],
): Record<InboxFilterId, number> {
  return {
    all: items.length,
    unread: items.filter((i) => i.unreadCount > 0).length,
    to_confirm: items.filter((i) => inboxOrderStatusKey(i) === "waiting").length,
    incidents: items.filter((i) => inboxOrderStatusKey(i) === "incident").length,
  };
}

export function formatMessageTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(locale === "pt" ? "pt-PT" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

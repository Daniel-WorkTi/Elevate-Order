import type { Supply } from "@/lib/order-domain";

export type InboxPriority = "critical" | "waiting" | "followup";

export type InboxItem = {
  id: string;
  supply: Supply;
  customer: string;
  country: string;
  /** ISO 3166-1 alpha-2 for flagcdn */
  countryCode: string;
  phone: string;
  total: number;
  currency: string;
  product: string;
  issueLabel: string;
  issueDetail: string;
  priority: InboxPriority;
  carrier: string | null;
  tracking: string | null;
  updatedAt: string;
};

export type InboxSummary = {
  needsContact: number;
  incidents: number;
  noResponse: number;
};

export function summarizeInbox(items: InboxItem[]): InboxSummary {
  return {
    needsContact: items.length,
    incidents: items.filter((item) => item.priority === "critical").length,
    noResponse: items.filter(
      (item) => item.priority === "waiting" || item.priority === "followup",
    ).length,
  };
}

export function sortInboxPriority(items: InboxItem[]): InboxItem[] {
  const rank: Record<InboxPriority, number> = {
    critical: 0,
    waiting: 1,
    followup: 2,
  };
  return [...items].sort((a, b) => {
    const byPriority = rank[a.priority] - rank[b.priority];
    if (byPriority !== 0) return byPriority;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function sortInboxItems(
  items: InboxItem[],
  sort: "priority" | "recent" = "priority",
): InboxItem[] {
  if (sort === "recent") {
    return [...items].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }
  return sortInboxPriority(items);
}

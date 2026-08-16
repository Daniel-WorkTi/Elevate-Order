import { formatDistanceToNow } from "date-fns";
import { formatMoney } from "@/lib/money/format-money";
import type { InboxItem, InboxPriority } from "@/lib/inbox/inbox-types";

export function formatInboxTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatInboxMoney(item: Pick<InboxItem, "total" | "currency">) {
  return formatMoney(item.total, item.currency, "en-US");
}

export function inboxPriorityAccent(priority: InboxPriority): {
  bar: string;
  icon: string;
  label: string;
  detail: string;
} {
  if (priority === "critical") {
    return {
      bar: "bg-red-500",
      icon: "text-red-600 bg-red-50",
      label: "text-red-600",
      detail: "text-[#667085]",
    };
  }
  if (priority === "waiting") {
    return {
      bar: "bg-amber-500",
      icon: "text-amber-600 bg-amber-50",
      label: "text-amber-600",
      detail: "text-[#667085]",
    };
  }
  return {
    bar: "bg-blue-500",
    icon: "text-blue-600 bg-blue-50",
    label: "text-blue-600",
    detail: "text-[#667085]",
  };
}

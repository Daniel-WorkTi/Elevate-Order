import { formatIsoRelative } from "@/lib/i18n/date-locale";
import type { Locale } from "@/lib/i18n/types";
import { formatMoney } from "@/lib/money/format-money";
import { formatStoredAmount } from "@/lib/currency/display-amount";
import type { InboxItem, InboxPriority } from "@/lib/inbox/inbox-types";

export function formatInboxTime(iso: string, locale: Locale = "pt") {
  return formatIsoRelative(iso, locale);
}

export function formatInboxMoney(
  item: Pick<InboxItem, "total" | "currency">,
  options?: {
    displayCurrency?: string;
    rateMap?: Record<string, number>;
  },
) {
  const display = options?.displayCurrency;
  const rateMap = options?.rateMap;
  if (!display || !rateMap) {
    return formatMoney(item.total, item.currency, "en-US");
  }
  return formatStoredAmount(item.total, item.currency, display, rateMap, "en-US");
}

export function inboxPriorityAccent(priority: InboxPriority): {
  icon: string;
  label: string;
  detail: string;
  dot: string;
} {
  if (priority === "critical") {
    return {
      icon: "text-red-600 bg-red-50",
      label: "text-red-600",
      detail: "text-[#667085]",
      dot: "bg-red-500",
    };
  }
  if (priority === "waiting") {
    return {
      icon: "text-amber-600 bg-amber-50",
      label: "text-amber-600",
      detail: "text-[#667085]",
      dot: "bg-amber-500",
    };
  }
  return {
    icon: "text-blue-600 bg-blue-50",
    label: "text-blue-600",
    detail: "text-[#667085]",
    dot: "bg-blue-500",
  };
}

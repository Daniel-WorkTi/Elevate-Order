import { CheckCircle2, Clock, Package } from "lucide-react";

import type { ConnectionStatCard } from "@/components/connections/workspace/connection-stat-cards";

export function buildConnectionStatCards(input: {
  lastSyncRelative: string;
  lastSyncExact: string;
  orderCount: string;
  supplyLabel: string;
  status: "connected" | "configured" | "error" | "not_configured";
  errorMessage?: string | null;
  lastSyncLabel?: string;
  waitingHint?: string;
}): ConnectionStatCard[] {
  const waitingHint = input.waitingHint ?? "Waiting for the first sync";
  const statusCard =
    input.status === "connected"
      ? {
          value: "OK",
          hint: "All systems operational",
          tone: "text-emerald-700 bg-emerald-50",
          valueClass: "text-[16px] text-emerald-700",
        }
      : input.status === "error"
        ? {
            value: "Error",
            hint: input.errorMessage?.trim() || "Synchronization problem",
            tone: "text-red-600 bg-red-50",
            valueClass: "text-[16px] text-red-600",
          }
        : input.status === "configured"
          ? {
              value: "Idle",
              hint: waitingHint,
              tone: "text-amber-700 bg-amber-50",
              valueClass: "text-[16px] text-amber-700",
            }
          : {
              value: "—",
              hint: "Not connected yet",
              tone: "text-[#667085] bg-[#F2F4F7]",
              valueClass: "text-[16px] text-[#667085]",
            };

  return [
    {
      key: "last-sync",
      label: input.lastSyncLabel ?? "Last sync",
      value: input.lastSyncRelative,
      hint: input.lastSyncExact,
      icon: Clock,
      tone: "text-blue-600 bg-blue-50",
    },
    {
      key: "orders",
      label: "Orders received",
      value: input.orderCount,
      hint: `From ${input.supplyLabel}`,
      icon: Package,
      tone: "text-violet-700 bg-violet-50",
    },
    {
      key: "status",
      label: "Status",
      value: statusCard.value,
      hint: statusCard.hint,
      icon: CheckCircle2,
      tone: statusCard.tone,
      valueClass: statusCard.valueClass,
    },
  ];
}

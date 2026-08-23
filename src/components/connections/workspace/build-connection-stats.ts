import { CheckCircle2, Clock, Package } from "lucide-react";

import type { ConnectionStatCard } from "@/components/connections/workspace/connection-stat-cards";

type Translate = (
  key: string,
  params?: Record<string, string | number | null | undefined>,
) => string;

export function buildConnectionStatCards(input: {
  lastSyncRelative: string;
  lastSyncExact: string;
  orderCount: string;
  supplyLabel: string;
  status: "connected" | "configured" | "error" | "not_configured";
  errorMessage?: string | null;
  lastSyncLabel?: string;
  waitingHint?: string;
  t: Translate;
}): ConnectionStatCard[] {
  const { t } = input;
  const waitingHint = input.waitingHint ?? t("connections.waitingFirstSync");
  const statusCard =
    input.status === "connected"
      ? {
          value: t("connections.statusOk"),
          hint: t("connections.allSystemsOperational"),
          tone: "text-emerald-700 bg-emerald-50",
          valueClass: "text-[16px] text-emerald-700",
        }
      : input.status === "error"
        ? {
            value: t("connections.error"),
            hint: input.errorMessage?.trim() || t("connections.syncProblem"),
            tone: "text-red-600 bg-red-50",
            valueClass: "text-[16px] text-red-600",
          }
        : input.status === "configured"
          ? {
              value: t("connections.statusIdle"),
              hint: waitingHint,
              tone: "text-amber-700 bg-amber-50",
              valueClass: "text-[16px] text-amber-700",
            }
          : {
              value: "—",
              hint: t("connections.notConnectedYet"),
              tone: "text-[#667085] bg-[#F2F4F7]",
              valueClass: "text-[16px] text-[#667085]",
            };

  return [
    {
      key: "last-sync",
      label: input.lastSyncLabel ?? t("connections.lastSync"),
      value: input.lastSyncExact,
      hint: input.lastSyncRelative,
      icon: Clock,
      tone: "text-blue-600 bg-blue-50",
      valueClass: "text-[15px] font-semibold",
    },
    {
      key: "orders",
      label: t("connections.ordersReceived"),
      value: input.orderCount,
      hint: t("connections.fromSupply", { supply: input.supplyLabel }),
      icon: Package,
      tone: "text-violet-700 bg-violet-50",
    },
    {
      key: "status",
      label: t("common.status"),
      value: statusCard.value,
      hint: statusCard.hint,
      icon: CheckCircle2,
      tone: statusCard.tone,
      valueClass: statusCard.valueClass,
    },
  ];
}

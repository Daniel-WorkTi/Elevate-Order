import type { OperationalOrder, OrderStatusKey } from "@/lib/order-domain";
import { getOrderStatus } from "@/lib/order-domain";
import type { OrderEventRow } from "@/lib/synced-orders.functions";

export type ProgressStepState = "done" | "current" | "upcoming" | "problem";

export type OrderProgressStep = {
  id: string;
  label: string;
  at: string | null;
  state: ProgressStepState;
  /** True when label comes from a live event (not a future pipeline placeholder). */
  fromEvent: boolean;
};

type PipelineStage = {
  id: string;
  /** i18n key for fallback label when no event matched yet */
  labelKey: string;
  pattern: RegExp;
};

/** Canonical call-center journey — Confirmado → Pago → Envio → Entregue */
export const ORDER_PROGRESS_PIPELINE: readonly PipelineStage[] = [
  {
    id: "confirmed",
    labelKey: "orders.detail.progress.confirmed",
    pattern: /confirm|nuevo|new|approved|open|criad|created/i,
  },
  {
    id: "paid",
    labelKey: "orders.detail.progress.paid",
    pattern: /paid|payment|pagament|aprov|cod|contra.?entrega|cash.?on.?delivery/i,
  },
  {
    id: "awaiting_ship",
    labelKey: "orders.detail.progress.awaitingShip",
    pattern: /wait|aguard|prepar|pend|hold|processing|ready|fulfill/i,
  },
  {
    id: "shipped",
    labelKey: "orders.detail.progress.shipped",
    pattern: /ship|enviad|transit|dispatch|out for delivery|tracking/i,
  },
  {
    id: "delivered",
    labelKey: "orders.detail.progress.delivered",
    pattern: /deliver|entregad|resolv|success/i,
  },
];

function eventLabel(event: OrderEventRow): string {
  return event.status_name?.trim() || event.details?.trim() || "";
}

function matchStageIndex(label: string): number {
  return ORDER_PROGRESS_PIPELINE.findIndex((stage) => stage.pattern.test(label));
}

function statusToStageIndex(key: OrderStatusKey): number {
  switch (key) {
    case "confirmed":
      return 0;
    case "waiting":
    case "messaged":
      return 2;
    case "shipped":
      return 3;
    case "delivered":
      return 4;
    case "cancelled":
    case "incident":
      return -1;
    default:
      return 0;
  }
}

/**
 * Build a compact progress rail from real events + order status.
 * Past stages = done, active = current, rest = upcoming.
 */
export function buildOrderProgress(
  events: OrderEventRow[],
  order: Pick<OperationalOrder, "status_name" | "details" | "created_at" | "last_event_at">,
  t: (key: string) => string,
): OrderProgressStep[] {
  const chronological = [...events].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
  );

  const matched: Array<{ stageIndex: number; label: string; at: string; eventId: string }> = [];
  for (const event of chronological) {
    const label = eventLabel(event);
    if (!label) continue;
    const stageIndex = matchStageIndex(label);
    if (stageIndex < 0) continue;
    const existing = matched.find((item) => item.stageIndex === stageIndex);
    if (existing) {
      existing.label = label;
      existing.at = event.event_date;
      existing.eventId = event.id;
    } else {
      matched.push({
        stageIndex,
        label,
        at: event.event_date,
        eventId: event.id,
      });
    }
  }

  const status = getOrderStatus(order);
  const isProblem = status.key === "incident" || status.key === "cancelled";

  let currentIndex =
    matched.length > 0
      ? Math.max(...matched.map((item) => item.stageIndex))
      : statusToStageIndex(status.key);

  if (currentIndex < 0) currentIndex = 0;

  // Ensure at least the first stage exists when we have a created order
  if (matched.length === 0 && (order.created_at || order.status_name)) {
    matched.push({
      stageIndex: Math.min(currentIndex, 0),
      label: order.status_name?.trim() || t(ORDER_PROGRESS_PIPELINE[0]!.labelKey),
      at: order.created_at ?? order.last_event_at ?? "",
      eventId: "synthetic-start",
    });
    currentIndex = Math.max(currentIndex, 0);
  }

  return ORDER_PROGRESS_PIPELINE.map((stage, index) => {
    const hit = matched.find((item) => item.stageIndex === index);
    if (hit) {
      const isCurrent = index === currentIndex;
      return {
        id: hit.eventId,
        label: hit.label || t(stage.labelKey),
        at: hit.at || null,
        state: isProblem && isCurrent ? "problem" : isCurrent ? "current" : "done",
        fromEvent: hit.eventId !== "synthetic-start",
      };
    }

    if (index < currentIndex) {
      return {
        id: `done-${stage.id}`,
        label: t(stage.labelKey),
        at: null,
        state: "done",
        fromEvent: false,
      };
    }

    if (index === currentIndex && matched.length === 0) {
      return {
        id: `current-${stage.id}`,
        label: order.status_name?.trim() || t(stage.labelKey),
        at: order.last_event_at ?? order.created_at ?? null,
        state: isProblem ? "problem" : "current",
        fromEvent: false,
      };
    }

    return {
      id: `upcoming-${stage.id}`,
      label: t(stage.labelKey),
      at: null,
      state: "upcoming",
      fromEvent: false,
    };
  });
}

export function sortEventsNewestFirst(events: OrderEventRow[]): OrderEventRow[] {
  return [...events].sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime(),
  );
}

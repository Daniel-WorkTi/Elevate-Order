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

/**
 * Shopify / storefront journey (ops rail):
 * 1. Pedido no site
 * 2. Pendente em confirmação
 * 3. Confirmado
 * 4. Enviado
 * 5. Entregue
 * 6. Pago
 *
 * Progress is delivery-based: paid is last. UI uses blue only (no green).
 */
export const ORDER_PROGRESS_PIPELINE: readonly PipelineStage[] = [
  {
    id: "ordered",
    labelKey: "orders.detail.progress.ordered",
    pattern:
      /pedido\s+(no\s+)?site|order\s+placed|criad[oa]|created|nuevo|new\s+order|shopify|\bopen\b/i,
  },
  {
    id: "pending_confirmation",
    labelKey: "orders.detail.progress.pendingConfirmation",
    pattern:
      /pendente(\s+em)?\s+confirma|pending\s+confirm|por\s+confirmar|awaiting\s+confirm|unfulfilled|unauthorized|aguardando\s+confirma/i,
  },
  {
    id: "confirmed",
    labelKey: "orders.detail.progress.confirmed",
    pattern: /confirmad[oa]|confirmed|aprovad[oa]|accepted|aceptad|authorized|autorizad/i,
  },
  {
    id: "shipped",
    labelKey: "orders.detail.progress.shipped",
    pattern:
      /ship|enviad|transit|tr[aá]nsito|dispatch|out for delivery|tracking|em\s+rota|caminho|fulfill/i,
  },
  {
    id: "delivered",
    labelKey: "orders.detail.progress.delivered",
    pattern: /entregue|entregad|deliver(ed)?(?!\s*and\s*paid)/i,
  },
  {
    id: "paid",
    labelKey: "orders.detail.progress.paid",
    pattern:
      /\bpago\b|paid|payment\s+(approved|captured|received)|cobrado|pagamento\s+aprovado|entregue\s+e\s+pago|delivered\s*(and|&)\s*paid/i,
  },
];

function eventLabel(event: OrderEventRow): string {
  return event.status_name?.trim() || event.details?.trim() || "";
}

function matchStageIndex(label: string): number {
  // Prefer later stages when a label could match more than one (e.g. "Entregue e pago").
  let best = -1;
  for (let i = 0; i < ORDER_PROGRESS_PIPELINE.length; i += 1) {
    if (ORDER_PROGRESS_PIPELINE[i]!.pattern.test(label)) best = i;
  }
  return best;
}

function statusToStageIndex(key: OrderStatusKey): number {
  switch (key) {
    case "waiting":
    case "messaged":
      return 1; // pending confirmation
    case "confirmed":
      return 2;
    case "shipped":
      return 3;
    case "delivered":
      return 4;
    case "incident":
      return 3; // typically after ship
    case "cancelled":
      return -1;
    default:
      return 0;
  }
}

/**
 * Build a compact progress rail from real events + order status.
 * Past stages = done, active = current, rest = upcoming.
 * Incident/cancelled mark the active stage as problem (call-center recovery).
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
    if (statusToStageIndex(status.key) > 0) {
      currentIndex = statusToStageIndex(status.key);
    } else {
      currentIndex = Math.max(currentIndex, 0);
    }
  }

  // Site order is implied once we have any later stage.
  if (matched.length > 0 && !matched.some((item) => item.stageIndex === 0)) {
    const earliest = chronological[0];
    matched.push({
      stageIndex: 0,
      label: t(ORDER_PROGRESS_PIPELINE[0]!.labelKey),
      at: earliest?.event_date ?? order.created_at ?? "",
      eventId: "synthetic-ordered",
    });
  }

  return ORDER_PROGRESS_PIPELINE.map((stage, index) => {
    const hit = matched.find((item) => item.stageIndex === index);
    if (hit) {
      const isCurrent = index === currentIndex;
      return {
        id: hit.eventId,
        label: hit.label || t(stage.labelKey),
        at: hit.at || null,
        state:
          index < currentIndex
            ? "done"
            : isCurrent
              ? isProblem
                ? "problem"
                : "current"
              : "upcoming",
        fromEvent: !hit.eventId.startsWith("synthetic-"),
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

    if (index === currentIndex) {
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

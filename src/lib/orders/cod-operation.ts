import { supplyMatchesSource, type OperationalOrder, type Supply } from "@/lib/order-domain";

export type CodOperationStatus = "pending_action" | "handled" | "externally_confirmed" | "not_applicable";

/**
 * Canonical Dropi source match for queue filters and SQL partial indexes.
 * Keep aligned with idx_orders_cod_dropi_pending in 20260828270000 migration.
 */
export function isDropiSupplySource(source: string): boolean {
  return supplyMatchesSource("dropi", source);
}

/** Postgres partial-index predicate — must match isDropiSupplySource(). */
export const DROPI_SOURCE_INDEX_PREDICATE =
  "source ILIKE '%dropi%' AND source NOT ILIKE '%dropea%'";

/** Dropi webhook status suggests supply-side confirmation (heuristic — not Elevate confirm). */
export function isDropiExternallyConfirmed(order: Pick<OperationalOrder, "status_name" | "details">): boolean {
  const haystack = `${order.status_name ?? ""} ${order.details ?? ""}`.trim();
  if (!haystack) return false;
  if (/(cancel|anulad|rechaz|reject|devolv|return)/i.test(haystack)) return false;
  return /(confirm|aceptad|accepted|aprobado|approved)/i.test(haystack);
}

export function isDropiOrder(order: Pick<OperationalOrder, "source">): boolean {
  return isDropiSupplySource(order.source);
}

export function isCodConfirmReply(order: Pick<OperationalOrder, "cod_reply_intent">): boolean {
  return order.cod_reply_intent === "confirm";
}

export function deriveCodOperationStatus(
  order: Pick<
    OperationalOrder,
    "source" | "status_name" | "details" | "cod_reply_intent" | "cod_handled_at"
  >,
): CodOperationStatus {
  if (!isDropiOrder(order) || !isCodConfirmReply(order)) {
    return "not_applicable";
  }
  if (isDropiExternallyConfirmed(order)) {
    return "externally_confirmed";
  }
  if (order.cod_handled_at) {
    return "handled";
  }
  return "pending_action";
}

export function isDropiCodPendingAction(
  order: Pick<
    OperationalOrder,
    "source" | "status_name" | "details" | "cod_reply_intent" | "cod_handled_at"
  >,
): boolean {
  return deriveCodOperationStatus(order) === "pending_action";
}

export function matchesSupplyFilter(supply: Supply, source: string): boolean {
  return supplyMatchesSource(supply, source);
}

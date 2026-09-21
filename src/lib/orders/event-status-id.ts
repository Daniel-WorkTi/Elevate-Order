/**
 * Normalize nullable provider status_id for upsert conflict targets.
 * Postgres UNIQUE treats NULL as distinct, so null status_id never conflicts.
 * Using 0 as the unknown/null sentinel prevents future duplicate event inserts
 * without rewriting historical NULL rows.
 */
export function eventStatusIdForUpsert(statusId: number | null | undefined): number {
  return typeof statusId === "number" && Number.isFinite(statusId) ? statusId : 0;
}

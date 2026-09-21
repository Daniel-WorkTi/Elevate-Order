/**
 * Legacy helper from global UNIQUE(order_id) era.
 * After workspace-scoped uniqueness, same external order_id MAY coexist
 * across workspaces — this no longer blocks writes.
 *
 * Kept as a documented no-op so callers/tests fail loudly if reintroduced
 * as a cross-tenant write gate incorrectly.
 */
export function collectCrossWorkspaceOrderCollisions(
  _existing: ReadonlyArray<{ order_id: number; workspace_id: string | null }>,
  _workspaceId: string,
): Set<number> {
  return new Set();
}

/** True when two workspaces may share the same external order_id. */
export function allowsSameExternalOrderIdAcrossWorkspaces(): boolean {
  return true;
}

/**
 * Global UNIQUE(order_id) means a row owned by another workspace must never be overwritten.
 * Shared by Dropi webhook + Dropea sync.
 */
export function collectCrossWorkspaceOrderCollisions(
  existing: ReadonlyArray<{ order_id: number; workspace_id: string | null }>,
  workspaceId: string,
): Set<number> {
  const blocked = new Set<number>();
  for (const row of existing) {
    if (row.workspace_id && row.workspace_id !== workspaceId) {
      blocked.add(row.order_id);
    }
  }
  return blocked;
}

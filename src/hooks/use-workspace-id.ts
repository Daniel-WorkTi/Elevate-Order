import { useWorkspaceContext } from "@/components/workspace/workspace-provider";

export type { WorkspaceSummary } from "@/lib/workspace/workspace.functions";

/**
 * UI preference for the active workspace (shared via WorkspaceProvider).
 * Authorization is always validated server-side — localStorage is never a tenant authority.
 */
export function useWorkspaceId() {
  return useWorkspaceContext();
}

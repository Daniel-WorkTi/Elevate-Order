import {
  requireWorkspaceAccess,
  WorkspaceAccessError,
  isWorkspaceAccessError,
} from "@/lib/workspace/require-workspace-access";
import { parseWorkspaceId } from "@/lib/workspace/parse-workspace-id";

/**
 * Parse + authorize workspace for an authenticated server fn.
 * Throws WorkspaceAccessError (403/401) on failure — never trust client ids alone.
 */
export async function authorizeWorkspaceInput(
  userId: string,
  workspaceIdRaw: string | null | undefined,
) {
  const workspaceId = parseWorkspaceId(workspaceIdRaw);
  if (!workspaceId) {
    throw new WorkspaceAccessError("invalid_workspace", "Invalid workspace id.");
  }
  return requireWorkspaceAccess(userId, workspaceId);
}

export { isWorkspaceAccessError, WorkspaceAccessError };

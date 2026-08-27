/**
 * Central workspace authorization.
 * Today: owner_user_id. Future: owner OR workspace_members — change only here.
 */

export class WorkspaceAccessError extends Error {
  readonly code: "unauthenticated" | "forbidden" | "not_found" | "invalid_workspace";

  constructor(code: WorkspaceAccessError["code"], message: string) {
    super(message);
    this.name = "WorkspaceAccessError";
    this.code = code;
  }
}

export type AuthorizedWorkspace = {
  id: string;
  name: string;
  ownerUserId: string;
};

export function isWorkspaceAccessError(error: unknown): error is WorkspaceAccessError {
  return error instanceof WorkspaceAccessError;
}

export function workspaceAccessHttpStatus(error: WorkspaceAccessError): number {
  if (error.code === "unauthenticated") return 401;
  if (error.code === "invalid_workspace" || error.code === "not_found") return 404;
  return 403;
}

/**
 * Validates that `userId` may operate on `workspaceId`.
 * Uses service_role read — call only after authenticating the user.
 */
export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string,
): Promise<AuthorizedWorkspace> {
  if (!userId?.trim()) {
    throw new WorkspaceAccessError("unauthenticated", "Authentication required.");
  }

  const { parseWorkspaceId } = await import("@/lib/workspace/parse-workspace-id");
  const id = parseWorkspaceId(workspaceId);
  if (!id) {
    throw new WorkspaceAccessError("invalid_workspace", "Invalid workspace id.");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .select("id, name, owner_user_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[workspace] requireWorkspaceAccess query failed", error.message);
    throw new WorkspaceAccessError("forbidden", "Workspace access denied.");
  }

  if (!data) {
    throw new WorkspaceAccessError("not_found", "Workspace not found.");
  }

  const ownerUserId = typeof data.owner_user_id === "string" ? data.owner_user_id : null;

  // Orphans (owner NULL) are never accessible to authenticated users.
  if (!ownerUserId || ownerUserId !== userId) {
    throw new WorkspaceAccessError("forbidden", "Workspace access denied.");
  }

  return {
    id: data.id,
    name: typeof data.name === "string" && data.name.trim() ? data.name : "My Workspace",
    ownerUserId,
  };
}

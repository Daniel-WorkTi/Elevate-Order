import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseWorkspaceId } from "@/lib/workspace/parse-workspace-id";
import {
  requireWorkspaceAccess,
  WorkspaceAccessError,
} from "@/lib/workspace/require-workspace-access";

export type WorkspaceSummary = {
  id: string;
  name: string;
};

function shopifyDomainToWorkspaceName(domain: string | null | undefined): string {
  if (!domain?.trim()) return "My Workspace";
  const base = domain
    .trim()
    .toLowerCase()
    .replace(/\.myshopify\.com$/i, "")
    .replace(/-/g, " ")
    .trim();
  if (!base) return "My Workspace";
  return base
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function displayName(name: string | null | undefined, fallback = "My Workspace"): string {
  return typeof name === "string" && name.trim() ? name.trim() : fallback;
}

/** Shared: list owned workspaces (service_role + owner filter). */
export async function listOwnedWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
  if (!userId) throw new WorkspaceAccessError("unauthenticated", "Authentication required.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .select("id, name")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[workspace] listOwnedWorkspaces failed", error.message);
    throw new Error("Unable to list workspaces.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: displayName(row.name),
  }));
}

/** Shared: ensure at least one owned workspace exists. Never claims orphans. */
export async function ensureOwnedWorkspace(userId: string): Promise<WorkspaceSummary> {
  const existing = await listOwnedWorkspaces(userId);
  if (existing[0]) return existing[0];

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const store = await supabaseAdmin
    .from("shopify_stores")
    .select("shop_domain, workspace_id")
    .eq("user_id", userId)
    .is("uninstalled_at", null)
    .order("installed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const name = shopifyDomainToWorkspaceName(store.data?.shop_domain);
  const linkedWorkspaceId = parseWorkspaceId(store.data?.workspace_id);

  if (linkedWorkspaceId) {
    try {
      const authorized = await requireWorkspaceAccess(userId, linkedWorkspaceId);
      return { id: authorized.id, name: authorized.name };
    } catch {
      // Not owned — create a new workspace (do not claim orphan/foreign).
    }
  }

  const inserted = await supabaseAdmin
    .from("workspaces")
    .insert({
      name,
      owner_user_id: userId,
    })
    .select("id, name")
    .single();

  if (inserted.error || !inserted.data) {
    console.error("[workspace] ensureOwnedWorkspace insert failed", inserted.error?.message);
    throw new Error("Unable to create workspace.");
  }

  if (store.data && !parseWorkspaceId(store.data.workspace_id)) {
    await supabaseAdmin
      .from("shopify_stores")
      .update({ workspace_id: inserted.data.id })
      .eq("user_id", userId)
      .is("workspace_id", null);
  }

  return {
    id: inserted.data.id,
    name: displayName(inserted.data.name, name),
  };
}

export async function resolveOwnedActiveWorkspace(
  userId: string,
  preferredWorkspaceId?: string | null,
): Promise<{ workspace: WorkspaceSummary; workspaces: WorkspaceSummary[] }> {
  let workspaces = await listOwnedWorkspaces(userId);
  if (workspaces.length === 0) {
    const created = await ensureOwnedWorkspace(userId);
    workspaces = [created];
  }

  const preferred = preferredWorkspaceId ? parseWorkspaceId(preferredWorkspaceId) : null;
  if (preferred) {
    const match = workspaces.find((w) => w.id === preferred);
    if (match) return { workspace: match, workspaces };
  }

  return { workspace: workspaces[0]!, workspaces };
}

export const listMyWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ workspaces: WorkspaceSummary[] }> => {
    return { workspaces: await listOwnedWorkspaces(context.userId) };
  });

export const ensureDefaultWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ workspace: WorkspaceSummary }> => {
    return { workspace: await ensureOwnedWorkspace(context.userId) };
  });

const resolveSchema = z.object({
  preferredWorkspaceId: z.string().uuid().optional(),
});

export const resolveActiveWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => resolveSchema.parse(data ?? {}))
  .handler(
    async ({
      context,
      data,
    }): Promise<{ workspace: WorkspaceSummary; workspaces: WorkspaceSummary[] }> => {
      return resolveOwnedActiveWorkspace(context.userId, data.preferredWorkspaceId);
    },
  );

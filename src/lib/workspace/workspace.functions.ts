import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseWorkspaceId } from "@/lib/workspace/parse-workspace-id";
import {
  isUniqueOwnerConflict,
  pickOwnedWorkspace,
  type OwnedWorkspaceCandidate,
} from "@/lib/workspace/pick-owned-workspace";
import {
  requireWorkspaceAccess,
  WorkspaceAccessError,
} from "@/lib/workspace/require-workspace-access";

export type WorkspaceSummary = {
  id: string;
  name: string;
};

/** In-flight de-dupe within a single server isolate (best-effort concurrency guard). */
const ensureInFlight = new Map<string, Promise<WorkspaceSummary>>();

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

type OwnedRow = { id: string; name: string | null; created_at: string | null };

/** Shared: list owned workspaces (service_role + owner filter), oldest first. */
export async function listOwnedWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
  if (!userId) throw new WorkspaceAccessError("unauthenticated", "Authentication required.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .select("id, name, created_at")
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

async function loadOwnedRows(userId: string): Promise<OwnedRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .select("id, name, created_at")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[workspace] loadOwnedRows failed", error.message);
    throw new Error("Unable to list workspaces.");
  }
  return (data ?? []) as OwnedRow[];
}

/**
 * Cheap operational probes for owned workspace ids — used only to pick among duplicates.
 * Never expands to foreign/ownerless workspaces.
 */
async function enrichOwnedCandidates(rows: OwnedRow[]): Promise<OwnedWorkspaceCandidate[]> {
  if (rows.length === 0) return [];
  if (rows.length === 1) {
    const only = rows[0]!;
    return [
      {
        id: only.id,
        name: displayName(only.name),
        createdAt: only.created_at,
      },
    ];
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ids = rows.map((r) => r.id);

  const [shopify, webhooks, wa, creds, orders] = await Promise.all([
    supabaseAdmin
      .from("shopify_stores")
      .select("workspace_id")
      .in("workspace_id", ids)
      .is("uninstalled_at", null),
    supabaseAdmin.from("workspace_webhook_endpoints").select("workspace_id").in("workspace_id", ids),
    supabaseAdmin.from("whatsapp_connections").select("workspace_id").in("workspace_id", ids),
    supabaseAdmin
      .from("workspace_provider_credentials")
      .select("workspace_id")
      .in("workspace_id", ids),
    supabaseAdmin.from("orders").select("workspace_id").in("workspace_id", ids).limit(200),
  ]);

  const setOf = (res: { data: { workspace_id: string | null }[] | null }) =>
    new Set((res.data ?? []).map((r) => r.workspace_id).filter(Boolean) as string[]);

  const shopifySet = setOf(shopify);
  const webhookSet = setOf(webhooks);
  const waSet = setOf(wa);
  const credSet = setOf(creds);
  const orderSet = setOf(orders);

  return rows.map((row) => ({
    id: row.id,
    name: displayName(row.name),
    createdAt: row.created_at,
    hasShopify: shopifySet.has(row.id),
    hasWebhook: webhookSet.has(row.id),
    hasWhatsApp: waSet.has(row.id),
    hasCredentials: credSet.has(row.id),
    hasOrders: orderSet.has(row.id),
  }));
}

async function selectExistingOwnedWorkspace(userId: string): Promise<WorkspaceSummary | null> {
  const rows = await loadOwnedRows(userId);
  if (rows.length === 0) return null;
  const candidates = await enrichOwnedCandidates(rows);
  const picked = pickOwnedWorkspace(candidates);
  if (!picked) return null;
  return { id: picked.id, name: picked.name };
}

async function ensureOwnedWorkspaceImpl(userId: string): Promise<WorkspaceSummary> {
  // 1+ owned → never create another (temporary multi-owned compatibility).
  const existing = await selectExistingOwnedWorkspace(userId);
  if (existing) return existing;

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

  // Re-check immediately before insert (narrows race window).
  const raced = await selectExistingOwnedWorkspace(userId);
  if (raced) return raced;

  const inserted = await supabaseAdmin
    .from("workspaces")
    .insert({
      name,
      owner_user_id: userId,
    })
    .select("id, name")
    .single();

  if (inserted.error || !inserted.data) {
    if (isUniqueOwnerConflict(inserted.error?.message)) {
      const afterConflict = await selectExistingOwnedWorkspace(userId);
      if (afterConflict) return afterConflict;
    }
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

/**
 * Ensure at least one owned workspace exists.
 * Never claims orphans. Never creates a second workspace when any owned row exists.
 * Best-effort in-flight de-dupe per userId within one server isolate.
 * DB UNIQUE(owner_user_id) remains pending reconciliation of historical duplicates.
 */
export async function ensureOwnedWorkspace(userId: string): Promise<WorkspaceSummary> {
  const inflight = ensureInFlight.get(userId);
  if (inflight) return inflight;

  const run = ensureOwnedWorkspaceImpl(userId).finally(() => {
    ensureInFlight.delete(userId);
  });
  ensureInFlight.set(userId, run);
  return run;
}

export async function resolveOwnedActiveWorkspace(
  userId: string,
  preferredWorkspaceId?: string | null,
): Promise<{ workspace: WorkspaceSummary; workspaces: WorkspaceSummary[] }> {
  let workspaces = await listOwnedWorkspaces(userId);
  if (workspaces.length === 0) {
    const created = await ensureOwnedWorkspace(userId);
    workspaces = await listOwnedWorkspaces(userId);
    if (workspaces.length === 0) workspaces = [created];
  }

  const preferred = preferredWorkspaceId ? parseWorkspaceId(preferredWorkspaceId) : null;
  if (preferred) {
    const match = workspaces.find((w) => w.id === preferred);
    if (match) return { workspace: match, workspaces };
  }

  // When multiple owned workspaces exist, pick operational preference (not merely [0]).
  const selected = await selectExistingOwnedWorkspace(userId);
  return { workspace: selected ?? workspaces[0]!, workspaces };
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

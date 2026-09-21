import { DROPI_WEBHOOK_PATH } from "@/lib/integrations/dropi/dropi-fields";

export type ResolvedWebhookAuth = {
  ok: boolean;
  workspaceId: string | null;
  supply: "dropi" | "dropea" | null;
};

/** Extract per-workspace webhook token from query or path. */
export function webhookTokenFromRequest(request: Request): string {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token")?.trim() ?? "";
  if (queryToken) return queryToken;
  const match = url.pathname.match(/\/webhooks\/orders\/([^/]+)\/?$/i);
  const pathToken = match?.[1] ? decodeURIComponent(match[1]).trim() : "";
  if (pathToken && pathToken !== "orders") return pathToken;
  return "";
}

/**
 * Map a DB endpoint row to auth. Missing/unknown token → reject (no writes).
 * Token A always resolves only to workspace A.
 */
export function authFromWebhookEndpointRow(
  row: { workspace_id: unknown; supply: unknown } | null | undefined,
): ResolvedWebhookAuth {
  if (!row?.workspace_id) {
    return { ok: false, workspaceId: null, supply: null };
  }
  const supply =
    row.supply === "dropea" || row.supply === "dropi" ? row.supply : "dropi";
  return { ok: true, workspaceId: String(row.workspace_id), supply };
}

/**
 * Auth for public order webhooks.
 * Writes require a workspace-scoped token from `workspace_webhook_endpoints`.
 * Never accept browser publishable keys or unscoped global tokens for ingest.
 */
export async function resolvePublicWebhookAuth(request: Request): Promise<ResolvedWebhookAuth> {
  const queryToken = webhookTokenFromRequest(request);
  if (!queryToken) {
    return { ok: false, workspaceId: null, supply: null };
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("workspace_webhook_endpoints")
      .select("workspace_id, supply")
      .eq("token", queryToken)
      .maybeSingle();

    return authFromWebhookEndpointRow(data);
  } catch (error) {
    console.error("workspace webhook token lookup failed", error);
  }

  return { ok: false, workspaceId: null, supply: null };
}

/** @deprecated Prefer resolvePublicWebhookAuth — kept for sync helpers. */
export function isPublicWebhookAuthorized(request: Request): boolean {
  // Sync helpers must not treat publishable keys as webhook write auth.
  const webhookToken = process.env["ELEVATE_WEBHOOK_TOKEN"]?.trim();
  if (webhookToken) {
    const queryToken = new URL(request.url).searchParams.get("token")?.trim() ?? "";
    if (queryToken && queryToken === webhookToken) return true;
  }
  return false;
}

/** Legacy path builder — never embeds global ELEVATE_WEBHOOK_TOKEN (no secret leak). */
export function buildWebhookRelativeUrl(path = DROPI_WEBHOOK_PATH): string {
  return path;
}

/** True when a global ingest token exists (legacy). Prefer per-workspace endpoints. */
export function webhookAuthConfigured(): boolean {
  return Boolean(process.env["ELEVATE_WEBHOOK_TOKEN"]?.trim());
}

import { DROPI_WEBHOOK_PATH } from "@/lib/integrations/dropi/dropi-fields";

export type ResolvedWebhookAuth = {
  ok: boolean;
  workspaceId: string | null;
  supply: "dropi" | "dropea" | null;
};

/** Extract per-workspace webhook token from query or path. */
function webhookTokenFromRequest(request: Request): string {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token")?.trim() ?? "";
  if (queryToken) return queryToken;
  const match = url.pathname.match(/\/webhooks\/orders\/([^/]+)\/?$/i);
  const pathToken = match?.[1] ? decodeURIComponent(match[1]).trim() : "";
  if (pathToken && pathToken !== "orders") return pathToken;
  return "";
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

    if (data?.workspace_id) {
      const supply =
        data.supply === "dropea" || data.supply === "dropi" ? data.supply : "dropi";
      return { ok: true, workspaceId: String(data.workspace_id), supply };
    }
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

/** Legacy global path builder (prefer getWorkspaceWebhookUrl). */
export function buildWebhookRelativeUrl(path = DROPI_WEBHOOK_PATH): string {
  const token = process.env["ELEVATE_WEBHOOK_TOKEN"]?.trim();
  if (!token) return path;
  return `${path}?token=${encodeURIComponent(token)}`;
}

/** True when a global ingest token exists (legacy). Prefer per-workspace endpoints. */
export function webhookAuthConfigured(): boolean {
  return Boolean(process.env["ELEVATE_WEBHOOK_TOKEN"]?.trim());
}

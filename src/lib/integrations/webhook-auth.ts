import { DROPI_WEBHOOK_PATH } from "@/lib/integrations/dropi/dropi-fields";

export type ResolvedWebhookAuth = {
  ok: boolean;
  workspaceId: string | null;
  supply: "dropi" | "dropea" | null;
};

/** Auth for public order webhooks: per-workspace token, global env token, or legacy apikey. */
export async function resolvePublicWebhookAuth(request: Request): Promise<ResolvedWebhookAuth> {
  const queryToken = new URL(request.url).searchParams.get("token")?.trim() ?? "";

  if (queryToken) {
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

    const globalToken = process.env["ELEVATE_WEBHOOK_TOKEN"]?.trim();
    if (globalToken && queryToken === globalToken) {
      return { ok: true, workspaceId: null, supply: null };
    }
  }

  const expectedKey = process.env["SUPABASE_PUBLISHABLE_KEY"]?.trim();
  const providedKey =
    request.headers.get("apikey") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (expectedKey && providedKey === expectedKey) {
    return { ok: true, workspaceId: null, supply: null };
  }

  return { ok: false, workspaceId: null, supply: null };
}

/** @deprecated Prefer resolvePublicWebhookAuth — kept for sync helpers. */
export function isPublicWebhookAuthorized(request: Request): boolean {
  const webhookToken = process.env["ELEVATE_WEBHOOK_TOKEN"]?.trim();
  if (webhookToken) {
    const queryToken = new URL(request.url).searchParams.get("token")?.trim() ?? "";
    if (queryToken && queryToken === webhookToken) return true;
  }

  const expectedKey = process.env["SUPABASE_PUBLISHABLE_KEY"]?.trim();
  const providedKey =
    request.headers.get("apikey") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (expectedKey && providedKey === expectedKey) return true;

  return false;
}

/** Legacy global path builder (prefer getWorkspaceWebhookUrl). */
export function buildWebhookRelativeUrl(path = DROPI_WEBHOOK_PATH): string {
  const token = process.env["ELEVATE_WEBHOOK_TOKEN"]?.trim();
  if (!token) return path;
  return `${path}?token=${encodeURIComponent(token)}`;
}

export function webhookAuthConfigured(): boolean {
  return Boolean(
    process.env["ELEVATE_WEBHOOK_TOKEN"]?.trim() ||
      process.env["SUPABASE_PUBLISHABLE_KEY"]?.trim() ||
      process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim(),
  );
}

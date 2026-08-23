import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DROPI_WEBHOOK_PATH } from "@/lib/integrations/dropi/dropi-fields";
import { randomWebhookToken } from "@/lib/integrations/webhook-token";

const PUBLIC_APP_URL =
  process.env["PUBLIC_APP_URL"]?.trim().replace(/\/+$/, "") ||
  "https://elevate-orders.vercel.app";

const inputSchema = z.object({
  workspaceId: z.string().uuid(),
  supply: z.enum(["dropi", "dropea"]),
});

export type WorkspaceWebhookResult = {
  workspaceId: string;
  supply: "dropi" | "dropea";
  webhookUrl: string;
  webhookRelativeUrl: string;
};

/** Get or create a unique paste-ready webhook URL for this workspace + supply. */
export const getWorkspaceWebhookUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<WorkspaceWebhookResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("workspace_webhook_endpoints")
      .select("token")
      .eq("workspace_id", data.workspaceId)
      .eq("supply", data.supply)
      .maybeSingle();

    if (lookupError) {
      console.error("workspace webhook lookup failed", lookupError);
      throw new Error("Unable to load webhook URL. Run the workspace webhook migration.");
    }

    let token = existing?.token as string | undefined;
    if (!token) {
      token = randomWebhookToken();
      const { error: insertError } = await supabaseAdmin.from("workspace_webhook_endpoints").insert({
        workspace_id: data.workspaceId,
        supply: data.supply,
        token,
      });
      if (insertError) {
        // Race: another request created it — re-read.
        const { data: raced } = await supabaseAdmin
          .from("workspace_webhook_endpoints")
          .select("token")
          .eq("workspace_id", data.workspaceId)
          .eq("supply", data.supply)
          .maybeSingle();
        token = (raced?.token as string | undefined) ?? token;
        if (insertError && !raced?.token) {
          console.error("workspace webhook insert failed", insertError);
          throw new Error("Unable to create webhook URL. Run the workspace webhook migration.");
        }
      }
    }

    const webhookRelativeUrl = `${DROPI_WEBHOOK_PATH}/${encodeURIComponent(token)}`;
    return {
      workspaceId: data.workspaceId,
      supply: data.supply,
      webhookRelativeUrl,
      webhookUrl: `${PUBLIC_APP_URL}${webhookRelativeUrl}`,
    };
  });

export function getPublicAppUrl() {
  return PUBLIC_APP_URL;
}

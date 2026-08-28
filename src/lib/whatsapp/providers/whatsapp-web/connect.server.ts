import {
  gatewayCreateSession,
  gatewayDeleteSession,
  gatewayEventsUrl,
  gatewayStatusUrl,
  mintGatewaySessionTokens,
} from "@/lib/whatsapp/gateway-client.server";
import { requireGatewayBaseUrl } from "@/lib/whatsapp/gateway-jwt.server";
import { toWhatsAppUserError, WhatsAppUserError } from "@/lib/whatsapp/errors";
import {
  assertWorkspaceCanStartWhatsAppWeb,
  ensureWhatsAppWebConnectionRow,
  markWhatsAppWebConnectionError,
} from "@/lib/whatsapp/providers/whatsapp-web/persist-connection.server";

export type StartWhatsAppWebConnectResponse = {
  ok: true;
  connectionId: string;
  gatewayUrl: string;
  eventsUrl: string;
  statusUrl: string;
};

export type DisconnectWhatsAppWebResponse = {
  ok: true;
  status: "disconnected";
};

export async function runStartWhatsAppWebConnect(input: {
  workspaceId: string;
  userId: string;
}): Promise<StartWhatsAppWebConnectResponse> {
  let connectionId: string | null = null;
  try {
    requireGatewayBaseUrl();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertWorkspaceCanStartWhatsAppWeb(supabaseAdmin, input.workspaceId);
    const row = await ensureWhatsAppWebConnectionRow(supabaseAdmin, input.workspaceId);
    connectionId = row.connectionId;

    const tokens = await mintGatewaySessionTokens({
      userId: input.userId,
      workspaceId: input.workspaceId,
      connectionId,
    });

    await gatewayCreateSession(tokens.createToken);

    return {
      ok: true,
      connectionId,
      gatewayUrl: requireGatewayBaseUrl(),
      eventsUrl: gatewayEventsUrl(connectionId, tokens.eventsToken),
      statusUrl: gatewayStatusUrl(connectionId, tokens.statusToken),
    };
  } catch (error) {
    if (connectionId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await markWhatsAppWebConnectionError(supabaseAdmin, connectionId, input.workspaceId);
    }
    if (error instanceof WhatsAppUserError) throw error;
    throw toWhatsAppUserError(error);
  }
}

export async function runDisconnectWhatsAppWeb(input: {
  workspaceId: string;
  userId: string;
  connectionId: string;
}): Promise<DisconnectWhatsAppWebResponse> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("id, workspace_id, provider")
      .eq("id", input.connectionId)
      .eq("workspace_id", input.workspaceId)
      .eq("provider", "whatsapp_web")
      .maybeSingle();

    if (error || !row) {
      throw new WhatsAppUserError("validation_failed", "Conexão WhatsApp não encontrada.");
    }

    const { deleteToken } = await mintGatewaySessionTokens({
      userId: input.userId,
      workspaceId: input.workspaceId,
      connectionId: input.connectionId,
    });

    await gatewayDeleteSession(input.connectionId, deleteToken);
    return { ok: true, status: "disconnected" };
  } catch (error) {
    if (error instanceof WhatsAppUserError) throw error;
    throw toWhatsAppUserError(error);
  }
}

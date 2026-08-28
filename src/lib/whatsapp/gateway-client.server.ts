import type { GatewayTokenClaims } from "@/lib/whatsapp/gateway-jwt.server";
import { requireGatewayBaseUrl, signGatewayActionToken } from "@/lib/whatsapp/gateway-jwt.server";

export type GatewaySessionTokens = {
  createToken: string;
  eventsToken: string;
  statusToken: string;
  deleteToken: string;
};

export async function mintGatewaySessionTokens(input: {
  userId: string;
  workspaceId: string;
  connectionId: string;
}): Promise<GatewaySessionTokens> {
  const base = (claims: GatewayTokenClaims) => signGatewayActionToken(claims);

  const [createToken, eventsToken, statusToken, deleteToken] = await Promise.all([
    base({
      sub: input.userId,
      workspace_id: input.workspaceId,
      connection_id: input.connectionId,
      action: "session:create",
    }),
    base({
      sub: input.userId,
      workspace_id: input.workspaceId,
      connection_id: input.connectionId,
      action: "session:events",
    }),
    base({
      sub: input.userId,
      workspace_id: input.workspaceId,
      connection_id: input.connectionId,
      action: "session:status",
    }),
    base({
      sub: input.userId,
      workspace_id: input.workspaceId,
      connection_id: input.connectionId,
      action: "session:delete",
    }),
  ]);

  return { createToken, eventsToken, statusToken, deleteToken };
}

export async function gatewayCreateSession(createToken: string): Promise<void> {
  const base = requireGatewayBaseUrl();
  const res = await fetch(`${base}/v1/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${createToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!res.ok) {
    throw new Error(`gateway_create_failed:${res.status}`);
  }
}

export async function gatewayDeleteSession(
  connectionId: string,
  deleteToken: string,
): Promise<void> {
  const base = requireGatewayBaseUrl();
  const res = await fetch(`${base}/v1/sessions/${connectionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${deleteToken}` },
  });
  if (!res.ok) {
    throw new Error(`gateway_delete_failed:${res.status}`);
  }
}

export function gatewayEventsUrl(connectionId: string, eventsToken: string): string {
  const base = requireGatewayBaseUrl();
  return `${base}/v1/sessions/${connectionId}/events?token=${encodeURIComponent(eventsToken)}`;
}

export function gatewayStatusUrl(connectionId: string, statusToken: string): string {
  const base = requireGatewayBaseUrl();
  return `${base}/v1/sessions/${connectionId}/status?token=${encodeURIComponent(statusToken)}`;
}

export type GatewaySendMessageInput = {
  connectionId: string;
  to: string;
  type: "text";
  text: string;
};

export type GatewaySendMessageResult = {
  ok: true;
  connectionId: string;
  whatsappMessageId: string;
};

export async function gatewaySendMessage(
  sendToken: string,
  body: GatewaySendMessageInput,
): Promise<GatewaySendMessageResult> {
  const base = requireGatewayBaseUrl();
  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `gateway_send_failed:${res.status}`);
  }

  return (await res.json()) as GatewaySendMessageResult;
}

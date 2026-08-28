export type InboundMessageProvider = "whatsapp_web";

/** Provider-agnostic inbound event — no Baileys types beyond the gateway. */
export type NormalizedInboundMessage = {
  provider: InboundMessageProvider;
  workspaceId: string;
  connectionId: string;
  externalMessageId: string;
  direction: "inbound";
  from: string;
  type: "text";
  text: string;
  timestamp: string;
};

export type InboundIngestResult = {
  ok: true;
  inserted: boolean;
  duplicate: boolean;
  messageId: string | null;
  conversationId: string | null;
  orderId: string | null;
  ambiguousOrderCount: number;
};

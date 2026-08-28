export type NormalizedInboundMessage = {
  provider: "whatsapp_web";
  workspaceId: string;
  connectionId: string;
  externalMessageId: string;
  direction: "inbound";
  from: string;
  type: "text";
  text: string;
  timestamp: string;
};

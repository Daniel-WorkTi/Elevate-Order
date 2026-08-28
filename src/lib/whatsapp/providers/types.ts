import type { WhatsAppConnectionStatus, WhatsAppProviderId } from "@/lib/whatsapp/domain-types";

export type WhatsAppConnectionPublicStatus = {
  configured: boolean;
  provider: WhatsAppProviderId | null;
  connectionId: string | null;
  status: WhatsAppConnectionStatus | "disconnected";
  verifiedName: string | null;
  displayPhoneNumber: string | null;
  connectedAt: string | null;
};

export type WhatsAppProviderContext = {
  workspaceId: string;
  userId: string;
};

export type SendTextMessageInput = {
  workspaceId: string;
  userId: string;
  orderId?: string | null;
  conversationId?: string | null;
  clientMessageId: string;
  recipientPhone: string;
  text: string;
};

export type SendTextMessageResult = {
  ok: true;
  messageId: string;
  clientMessageId: string;
  status: "sent" | "queued" | "failed";
  whatsappMessageId: string | null;
  deliveryHint?: "recipient_is_connected_account" | null;
};

export interface WhatsAppProvider {
  readonly id: WhatsAppProviderId;
  isConfigured(): boolean;
  getConnectionStatus(workspaceId: string): Promise<WhatsAppConnectionPublicStatus>;
  sendTextMessage(input: SendTextMessageInput): Promise<SendTextMessageResult>;
}

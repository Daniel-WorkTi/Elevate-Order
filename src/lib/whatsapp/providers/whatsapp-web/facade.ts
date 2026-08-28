import type { WhatsAppProvider } from "@/lib/whatsapp/providers/types";
import { getWhatsAppWebConnectionStatus } from "@/lib/whatsapp/providers/whatsapp-web/connection-status.server";
import { runSendWhatsAppTextMessage } from "@/lib/whatsapp/providers/whatsapp-web/send-message.server";
import { isWhatsAppGatewayConfigured } from "@/lib/whatsapp/providers/context";

export const whatsappWebProvider: WhatsAppProvider = {
  id: "whatsapp_web",

  isConfigured() {
    return isWhatsAppGatewayConfigured();
  },

  getConnectionStatus(workspaceId: string) {
    return getWhatsAppWebConnectionStatus(workspaceId);
  },

  sendTextMessage(input) {
    return runSendWhatsAppTextMessage(input);
  },
};

export {
  runDisconnectWhatsAppWeb,
  runStartWhatsAppWebConnect,
} from "@/lib/whatsapp/providers/whatsapp-web/connect.server";
export { runSendWhatsAppTextMessage } from "@/lib/whatsapp/providers/whatsapp-web/send-message.server";
export type {
  DisconnectWhatsAppWebResponse,
  StartWhatsAppWebConnectResponse,
} from "@/lib/whatsapp/providers/whatsapp-web/connect.server";

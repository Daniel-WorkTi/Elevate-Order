import type { WhatsAppProvider } from "@/lib/whatsapp/providers/types";
import { getWhatsAppWebConnectionStatus } from "@/lib/whatsapp/providers/whatsapp-web/connection-status.server";
import { isWhatsAppServerConfigured } from "@/lib/whatsapp/providers/meta-cloud/config";

/**
 * Legacy Meta Cloud API provider — isolated, not used by active UI.
 * Connection status reads existing meta_cloud rows for display only.
 */
export const metaCloudProvider: WhatsAppProvider = {
  id: "meta_cloud",

  isConfigured() {
    return isWhatsAppServerConfigured();
  },

  getConnectionStatus(workspaceId: string) {
    return getWhatsAppWebConnectionStatus(workspaceId);
  },

  async sendTextMessage() {
    throw new Error("Meta Cloud outbound messaging is not available.");
  },
};

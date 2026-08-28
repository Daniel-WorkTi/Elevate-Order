import type { WhatsAppProvider } from "@/lib/whatsapp/providers/types";
import type { WhatsAppProviderId } from "@/lib/whatsapp/domain-types";
import { resolveActiveWhatsAppProviderId } from "@/lib/whatsapp/providers/context";
import { metaCloudProvider } from "@/lib/whatsapp/providers/meta-cloud/facade";
import { whatsappWebProvider } from "@/lib/whatsapp/providers/whatsapp-web";

const providers: Record<WhatsAppProviderId, WhatsAppProvider> = {
  whatsapp_web: whatsappWebProvider,
  meta_cloud: metaCloudProvider,
};

export function getWhatsAppProvider(id: WhatsAppProviderId): WhatsAppProvider {
  return providers[id];
}

export function getActiveWhatsAppProvider(): WhatsAppProvider {
  return getWhatsAppProvider(resolveActiveWhatsAppProviderId());
}

export function listWhatsAppProviders(): WhatsAppProvider[] {
  return Object.values(providers);
}

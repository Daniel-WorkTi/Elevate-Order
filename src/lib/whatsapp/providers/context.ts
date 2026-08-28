import type { WhatsAppProviderId } from "@/lib/whatsapp/domain-types";
import { isWhatsAppProviderId } from "@/lib/whatsapp/domain-types";

const DEFAULT_PROVIDER: WhatsAppProviderId = "whatsapp_web";

export function resolveActiveWhatsAppProviderId(): WhatsAppProviderId {
  const raw = process.env["WHATSAPP_PROVIDER"]?.trim();
  if (raw && isWhatsAppProviderId(raw)) return raw;
  return DEFAULT_PROVIDER;
}

export function tryGetWhatsAppGatewayUrl(): string | null {
  const url = process.env["WHATSAPP_GATEWAY_URL"]?.trim();
  return url || null;
}

export function isWhatsAppGatewayConfigured(): boolean {
  return tryGetWhatsAppGatewayUrl() !== null;
}

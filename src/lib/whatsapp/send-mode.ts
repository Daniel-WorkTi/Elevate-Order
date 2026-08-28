import type { WhatsAppConnectionPublicStatus } from "@/lib/whatsapp/providers/types";

/** Gateway configured — never use wa.me in the product UI. */
export function usesWhatsAppGateway(
  status: WhatsAppConnectionPublicStatus | null | undefined,
): boolean {
  return Boolean(status?.configured);
}

/** Ready to send via Elevate → gateway → Baileys (no browser). */
export function canSendWhatsAppInApp(
  status: WhatsAppConnectionPublicStatus | null | undefined,
  hasPhone: boolean,
): boolean {
  return usesWhatsAppGateway(status) && hasPhone && status?.status === "connected";
}

/** Legacy fallback when gateway is not deployed. */
export function showWhatsAppMeFallback(
  status: WhatsAppConnectionPublicStatus | null | undefined,
  hasPhone: boolean,
): boolean {
  return hasPhone && !usesWhatsAppGateway(status);
}

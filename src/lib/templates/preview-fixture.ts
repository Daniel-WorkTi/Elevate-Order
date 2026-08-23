import type { TemplateRenderContext } from "@/lib/templates/types";

/** Preview-only fixture. Never used for real WhatsApp / order messaging. */
export function createPreviewContext(options?: {
  withTracking?: boolean;
}): TemplateRenderContext {
  const withTracking = options?.withTracking ?? true;

  return {
    supply: "dropi",
    customerName: "Marta Silva",
    orderId: "#DP-92744",
    shopifyOrderId: 1002841,
    statusName: "Delivery incident",
    details: "Incomplete delivery address",
    trackingCode: withTracking ? "PT927391829PT" : null,
    trackingUrl: withTracking ? "https://example.invalid/tracking/preview" : null,
    shippingCompany: "InPost",
    total: 64.8,
    currency: "EUR",
  };
}

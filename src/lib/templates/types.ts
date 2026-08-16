import type { Supply } from "@/lib/order-domain";

export type TemplateKind =
  | "confirmation"
  | "follow_up"
  | "address_problem"
  | "delivery_attempt"
  | "tracking_update"
  | "incident"
  | "cancelled";

export type MessageTemplateRecord = {
  id: string;
  kind: TemplateKind;
  name: string;
  /** Short line for the left rail. */
  description: string;
  /** Longer purpose line shown above the editor. */
  purpose: string;
  content: string;
  updatedAt: string | null;
  /** True when content differs from the built-in default for this kind. */
  isCustom: boolean;
};

export type TemplateVariableKey =
  | "customer_name"
  | "order_id"
  | "shopify_order_id"
  | "status_name"
  | "details"
  | "tracking_code"
  | "tracking_url"
  | "shipping_company"
  | "total"
  | "currency"
  | "tracking_section";

export type TemplateVariableDef = {
  key: TemplateVariableKey;
  token: string;
  label: string;
};

/** Context used only for preview/rendering — never invents tracking URLs. */
export type TemplateRenderContext = {
  supply: Supply;
  customerName?: string | null;
  orderId: string;
  shopifyOrderId?: string | number | null;
  statusName?: string | null;
  details?: string | null;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  shippingCompany?: string | null;
  total?: number | null;
  currency?: string | null;
};

export type RenderTemplateResult = {
  text: string;
  unsupported: string[];
};

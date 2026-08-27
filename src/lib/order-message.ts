import {
  formatOrderId,
  formatOrderTotal,
  getOrderStatus,
  getOrderSupply,
  type OperationalOrder,
  type Supply,
} from "@/lib/order-domain";
import { displayCarrierName } from "@/lib/carriers";
import type { LanguageCode } from "@/lib/i18n/languages";
import {
  DEFAULT_TEMPLATE_LANGUAGE,
  getTemplate,
  renderOrderTemplate,
  type TemplateKind,
} from "@/lib/templates";

export type MessageTemplateId = TemplateKind;

/** @deprecated Prefer MessageTemplateRecord from @/lib/templates — kept for Select labels. */
export type MessageTemplate = {
  id: MessageTemplateId;
  label: string;
  body: string;
};

const KIND_LABEL: Record<TemplateKind, string> = {
  confirmation: "Order confirmation",
  follow_up: "No response follow-up",
  address_problem: "Address problem",
  delivery_attempt: "Delivery attempt",
  tracking_update: "Tracking update",
  incident: "Incident",
  cancelled: "Cancelled order",
};

export function templatesForOrder(
  _order: OperationalOrder,
  language: LanguageCode = DEFAULT_TEMPLATE_LANGUAGE,
): MessageTemplate[] {
  const kinds: TemplateKind[] = [
    "confirmation",
    "follow_up",
    "address_problem",
    "delivery_attempt",
    "tracking_update",
    "incident",
    "cancelled",
  ];
  return kinds.map((kind) => {
    const record = getTemplate(kind, language);
    return {
      id: kind,
      label: KIND_LABEL[kind],
      body: record?.content ?? "",
    };
  });
}

/** Fallback list for SSR / first paint before localStorage merges. */
export const ORDER_MESSAGE_TEMPLATES: readonly MessageTemplate[] = (
  [
    "confirmation",
    "follow_up",
    "address_problem",
    "delivery_attempt",
    "tracking_update",
    "incident",
    "cancelled",
  ] as const
).map((id) => ({
  id,
  label: KIND_LABEL[id],
  body: getTemplate(id)?.content ?? "",
}));

export function pickDefaultTemplate(order: OperationalOrder): MessageTemplateId {
  const status = getOrderStatus(order);
  if (status.key === "incident") {
    const details = (order.details ?? "").toLowerCase();
    if (/address|morada|endereço|incorrect|incomplet/.test(details)) return "address_problem";
    return "incident";
  }
  if (status.key === "cancelled") return "cancelled";
  if (status.key === "waiting" || status.key === "messaged") return "follow_up";
  if (status.key === "shipped" || order.tracking_code) return "tracking_update";
  return "confirmation";
}

export function orderToTemplateContext(order: OperationalOrder) {
  const supply: Supply = getOrderSupply(order) ?? "dropi";
  const status = getOrderStatus(order);
  return {
    supply,
    customerName: order.customer_name,
    orderId: formatOrderId(order),
    shopifyOrderId: order.shopify_order_id,
    statusName: order.status_name?.trim() || status.label,
    details: order.details,
    trackingCode: order.tracking_code,
    trackingUrl: order.tracking_url,
    shippingCompany: order.shipping_company,
    total: order.total,
    currency: order.currency,
  };
}

export function resolveOrderMessage(templateBody: string, order: OperationalOrder): string {
  const { text } = renderOrderTemplate({
    template: templateBody,
    context: orderToTemplateContext(order),
  });
  return text;
}

export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export type MessageFieldChip = {
  id: string;
  label: string;
  value: string;
};

export function availableMessageChips(order: OperationalOrder): MessageFieldChip[] {
  const chips: MessageFieldChip[] = [
    { id: "order_id", label: "Order ID", value: formatOrderId(order) },
    { id: "status", label: "Status", value: getOrderStatus(order).label },
  ];
  if (order.details?.trim()) {
    chips.push({ id: "reason", label: "Reason", value: order.details.trim() });
  }
  if (order.tracking_code?.trim()) {
    chips.push({ id: "tracking", label: "Tracking", value: order.tracking_code.trim() });
  }
  if (order.shipping_company?.trim()) {
    chips.push({
      id: "carrier",
      label: "Carrier",
      value: displayCarrierName(order.shipping_company),
    });
  }
  if (order.total != null) {
    chips.push({ id: "total", label: "Total", value: formatOrderTotal(order) ?? String(order.total) });
  }
  return chips;
}

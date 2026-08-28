import {
  formatOrderId,
  formatOrderTotal,
  getOrderStatus,
  getOrderSupply,
  ORDER_STATUS_I18N_KEY,
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
import { TEMPLATE_KIND_I18N } from "@/lib/templates/template-kind-i18n";

export type MessageTemplateId = TemplateKind;

export type MessageTemplate = {
  id: MessageTemplateId;
  label: string;
  body: string;
};

export type TemplateLabelFn = (kind: TemplateKind) => string;

export function defaultTemplateLabelFn(
  t: (key: string) => string,
): TemplateLabelFn {
  return (kind) => t(TEMPLATE_KIND_I18N[kind].name);
}

export function templatesForOrder(
  _order: OperationalOrder,
  language: LanguageCode = DEFAULT_TEMPLATE_LANGUAGE,
  labelForKind?: TemplateLabelFn,
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
  const label = labelForKind ?? ((kind) => kind);
  return kinds.map((kind) => {
    const record = getTemplate(kind, language);
    return {
      id: kind,
      label: label(kind),
      body: record?.content ?? "",
    };
  });
}

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

export function orderToTemplateContext(
  order: OperationalOrder,
  t?: (key: string) => string,
) {
  const supply: Supply = getOrderSupply(order) ?? "dropi";
  const status = getOrderStatus(order);
  const statusName =
    order.status_name?.trim() ||
    (t ? t(ORDER_STATUS_I18N_KEY[status.key]) : status.label);

  return {
    supply,
    customerName: order.customer_name,
    orderId: formatOrderId(order),
    shopifyOrderId: order.shopify_order_id,
    statusName,
    details: order.details,
    trackingCode: order.tracking_code,
    trackingUrl: order.tracking_url,
    shippingCompany: order.shipping_company,
    total: order.total,
    currency: order.currency,
  };
}

export function resolveOrderMessage(
  templateBody: string,
  order: OperationalOrder,
  language: LanguageCode = DEFAULT_TEMPLATE_LANGUAGE,
  t?: (key: string) => string,
): string {
  const { text } = renderOrderTemplate({
    template: templateBody,
    context: orderToTemplateContext(order, t),
    language,
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

const CHIP_LABEL_KEY: Record<string, string> = {
  order_id: "orders.detail.orderId",
  status: "common.status",
  reason: "orders.detail.reason",
  tracking: "orders.detail.tracking",
  carrier: "orders.detail.carrier",
  total: "orders.detail.total",
};

export function availableMessageChips(
  order: OperationalOrder,
  t?: (key: string) => string,
): MessageFieldChip[] {
  const status = getOrderStatus(order);
  const statusLabel =
    order.status_name?.trim() || (t ? t(ORDER_STATUS_I18N_KEY[status.key]) : status.label);

  const chips: MessageFieldChip[] = [
    {
      id: "order_id",
      label: t?.(CHIP_LABEL_KEY["order_id"]!) ?? "order_id",
      value: formatOrderId(order),
    },
    {
      id: "status",
      label: t?.(CHIP_LABEL_KEY["status"]!) ?? "status",
      value: statusLabel,
    },
  ];
  if (order.details?.trim()) {
    chips.push({
      id: "reason",
      label: t?.(CHIP_LABEL_KEY["reason"]!) ?? "reason",
      value: order.details.trim(),
    });
  }
  if (order.tracking_code?.trim()) {
    chips.push({
      id: "tracking",
      label: t?.(CHIP_LABEL_KEY["tracking"]!) ?? "tracking",
      value: order.tracking_code.trim(),
    });
  }
  if (order.shipping_company?.trim()) {
    chips.push({
      id: "carrier",
      label: t?.(CHIP_LABEL_KEY["carrier"]!) ?? "carrier",
      value: displayCarrierName(order.shipping_company),
    });
  }
  if (order.total != null) {
    chips.push({
      id: "total",
      label: t?.(CHIP_LABEL_KEY["total"]!) ?? "total",
      value: formatOrderTotal(order) ?? String(order.total),
    });
  }
  return chips;
}

import type { TemplateVariableDef, TemplateVariableKey } from "@/lib/templates/types";

const ALL: Record<TemplateVariableKey, TemplateVariableDef> = {
  customer_name: { key: "customer_name", token: "{{customer_name}}", label: "Customer name" },
  order_id: { key: "order_id", token: "{{order_id}}", label: "Order ID" },
  shopify_order_id: {
    key: "shopify_order_id",
    token: "{{shopify_order_id}}",
    label: "Shopify order",
  },
  status_name: { key: "status_name", token: "{{status_name}}", label: "Status" },
  details: { key: "details", token: "{{details}}", label: "Reason" },
  tracking_code: { key: "tracking_code", token: "{{tracking_code}}", label: "Tracking code" },
  tracking_url: { key: "tracking_url", token: "{{tracking_url}}", label: "Tracking URL" },
  shipping_company: {
    key: "shipping_company",
    token: "{{shipping_company}}",
    label: "Carrier",
  },
  total: { key: "total", token: "{{total}}", label: "Total" },
  currency: { key: "currency", token: "{{currency}}", label: "Currency" },
  tracking_section: {
    key: "tracking_section",
    token: "{{tracking_section}}",
    label: "Tracking section",
  },
};

/** Shared variables — one template set is used for Dropi and Dropea. */
const TEMPLATE_KEYS: TemplateVariableKey[] = [
  "customer_name",
  "order_id",
  "shopify_order_id",
  "status_name",
  "details",
  "tracking_code",
  "tracking_url",
  "shipping_company",
  "total",
  "currency",
  "tracking_section",
];

export function templateVariables(): TemplateVariableDef[] {
  return TEMPLATE_KEYS.map((key) => ALL[key]);
}

export function isVariableSupported(key: string): boolean {
  return TEMPLATE_KEYS.includes(key as TemplateVariableKey);
}

export function extractPlaceholders(content: string): string[] {
  const matches = content.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  const keys = new Set<string>();
  for (const match of matches) {
    if (match[1]) keys.add(match[1]);
  }
  return [...keys];
}

export function findMalformedPlaceholders(content: string): string[] {
  const issues: string[] = [];
  const open = (content.match(/\{\{/g) ?? []).length;
  const close = (content.match(/\}\}/g) ?? []).length;
  if (open !== close) {
    issues.push("Malformed placeholder syntax: unmatched {{ or }}.");
  }
  const broken = content.match(/\{\{[^}]*$|\{\{[^}]*\{/g);
  if (broken?.length) {
    issues.push("Malformed placeholder syntax detected.");
  }
  return issues;
}

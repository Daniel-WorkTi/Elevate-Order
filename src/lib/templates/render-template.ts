import { displayCarrierName } from "@/lib/carriers";
import { formatOrderTotal, getOrderCurrency, safeTrackingHref } from "@/lib/order-domain";
import {
  extractPlaceholders,
  isVariableSupported,
} from "@/lib/templates/template-variables";
import type { RenderTemplateResult, TemplateRenderContext } from "@/lib/templates/types";

function buildTrackingSection(ctx: TemplateRenderContext): string {
  const code = ctx.trackingCode?.trim() || "";
  const url = safeTrackingHref(ctx.trackingUrl);
  if (!code && !url) return "";

  const lines: string[] = [];
  if (code) lines.push(`Código de rastreio: ${code}`);
  if (url) lines.push(`Rastreio: ${url}`);
  return lines.join("\n");
}

function formatTotal(ctx: TemplateRenderContext): string {
  if (ctx.total == null || !Number.isFinite(ctx.total)) return "";
  return (
    formatOrderTotal({
      total: ctx.total,
      currency: ctx.currency ?? null,
    }) ?? ""
  );
}

function valueForKey(key: string, ctx: TemplateRenderContext): string | null {
  switch (key) {
    case "customer_name":
      return ctx.customerName?.trim() || "";
    case "order_id":
      return ctx.orderId;
    case "shopify_order_id":
      return ctx.shopifyOrderId != null && String(ctx.shopifyOrderId).trim()
        ? String(ctx.shopifyOrderId)
        : "";
    case "status_name":
      return ctx.statusName?.trim() || "";
    case "details":
      return ctx.details?.trim() || "";
    case "tracking_code":
      return ctx.trackingCode?.trim() || "";
    case "tracking_url":
      return safeTrackingHref(ctx.trackingUrl) || "";
    case "shipping_company":
      return displayCarrierName(ctx.shippingCompany);
    case "total":
      return formatTotal(ctx);
    case "currency":
      return ctx.currency?.trim()
        ? ctx.currency.trim().toUpperCase()
        : ctx.total != null
          ? getOrderCurrency({ currency: ctx.currency ?? null })
          : "";
    case "tracking_section":
      return buildTrackingSection(ctx);
    default:
      return null;
  }
}

/**
 * Central template resolver. Never invents tracking URLs. Omits empty optional sections cleanly.
 * Unsupported variables are reported and left as a safe warning marker in output.
 */
export function renderOrderTemplate(input: {
  template: string;
  context: TemplateRenderContext;
}): RenderTemplateResult {
  const { template, context } = input;
  const unsupported: string[] = [];

  let text = template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_full, key: string) => {
    if (!isVariableSupported(key)) {
      if (!unsupported.includes(key)) unsupported.push(key);
      return `[variável indisponível: ${key}]`;
    }
    const value = valueForKey(key, context);
    if (value === null) {
      if (!unsupported.includes(key)) unsupported.push(key);
      return `[variável indisponível: ${key}]`;
    }
    return value;
  });

  // Collapse blank lines left by omitted optional sections (e.g. tracking_section).
  text = text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, unsupported };
}

export function listUnsupportedVariables(content: string) {
  return extractPlaceholders(content).filter((key) => !isVariableSupported(key));
}

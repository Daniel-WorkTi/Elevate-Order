import type { Supply } from "@/lib/order-domain";

/** Carrier/tracking slice shared by Dropi and Dropea after supply-specific mapping. */
export type NormalizedSupplyLogistics = {
  supply: Extract<Supply, "dropi" | "dropea">;
  shippingCompany: string | null;
  trackingCode: string | null;
  trackingUrl: string | null;
};

export function asLogisticsString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export function pickFirstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const text = asLogisticsString(record[key]);
    if (text) return text;
  }
  return null;
}

export function emptyLogistics(
  supply: Extract<Supply, "dropi" | "dropea">,
): NormalizedSupplyLogistics {
  return {
    supply,
    shippingCompany: null,
    trackingCode: null,
    trackingUrl: null,
  };
}

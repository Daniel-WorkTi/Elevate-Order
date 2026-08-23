import {
  emptyLogistics,
  pickFirstString,
  type NormalizedSupplyLogistics,
} from "@/lib/orders/normalized-logistics";

/**
 * Maps Dropi webhook/order payloads onto ELEVATE logistics fields.
 * Carrier comes from Dropi's `shipping_company` on that order — never from country.
 */
export function normalizeDropiOrder(raw: unknown): NormalizedSupplyLogistics {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyLogistics("dropi");
  }

  const record = raw as Record<string, unknown>;
  const nested =
    record["order"] && typeof record["order"] === "object" && !Array.isArray(record["order"])
      ? (record["order"] as Record<string, unknown>)
      : null;

  const from = (keys: readonly string[]) =>
    pickFirstString(record, keys) ?? (nested ? pickFirstString(nested, keys) : null);

  return {
    supply: "dropi",
    shippingCompany: from(["shipping_company"]),
    trackingCode: from(["tracking_code"]),
    trackingUrl: from(["tracking_url"]),
  };
}

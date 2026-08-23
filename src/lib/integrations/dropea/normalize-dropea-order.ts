import {
  emptyLogistics,
  pickFirstString,
  type NormalizedSupplyLogistics,
} from "@/lib/orders/normalized-logistics";

/**
 * Maps a Dropea payload onto ELEVATE logistics fields.
 *
 * Backend gap: this repo has no Dropea REST order schema. Dropea ingest currently
 * shares `POST /api/public/webhooks/orders`, which persists `shipping_company`,
 * `tracking_code`, and `tracking_url` when those keys are present.
 *
 * No hypothetical Dropea properties (carrier, courier, logistics_provider, …)
 * are invented. Missing `shipping_company` → null; UI falls back to Truck + raw
 * name, or "Carrier unavailable".
 */
export function normalizeDropeaOrder(raw: unknown): NormalizedSupplyLogistics {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyLogistics("dropea");
  }

  const record = raw as Record<string, unknown>;

  return {
    supply: "dropea",
    shippingCompany: pickFirstString(record, ["shipping_company"]),
    trackingCode: pickFirstString(record, ["tracking_code"]),
    trackingUrl: pickFirstString(record, ["tracking_url"]),
  };
}

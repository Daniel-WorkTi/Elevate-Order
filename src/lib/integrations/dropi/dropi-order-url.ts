/**
 * Dropi dashboard URLs — no per-order deep-link documented in Dropi API/integration.
 * Opens the general orders area; operator searches by order_id (Dropi numeric id).
 *
 * Optional override: VITE_DROPI_DASHBOARD_URL (e.g. https://app.dropi.es)
 */
const DEFAULT_DROPI_DASHBOARD_URL = "https://app.dropi.co";

export function dropiDashboardBaseUrl(): string {
  const fromEnv =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env["VITE_DROPI_DASHBOARD_URL"] === "string"
      ? import.meta.env["VITE_DROPI_DASHBOARD_URL"].trim()
      : "";
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    return fromEnv.replace(/\/+$/, "");
  }
  return DEFAULT_DROPI_DASHBOARD_URL;
}

/** Best-effort URL — general orders panel, not a verified per-order deep-link. */
export function dropiOrdersPanelUrl(): string {
  return `${dropiDashboardBaseUrl()}/orders`;
}

export function dropiOrderReferenceLabel(dropiOrderId: number): string {
  return String(dropiOrderId);
}

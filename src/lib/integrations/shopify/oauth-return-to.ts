/**
 * Sanitize post-OAuth redirect targets.
 * Only allowlist paths — never open redirects.
 */

export const DEFAULT_SHOPIFY_OAUTH_RETURN_TO = "/connections/shopify";

const ALLOWED_EXACT = new Set([
  "/connections/shopify",
  "/onboarding",
  "/onboarding?step=configuration",
  // Legacy aliases accepted then normalized
  "/onboarding?step=store",
  "/onboarding?step=orders",
]);

export function sanitizeShopifyOauthReturnTo(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return DEFAULT_SHOPIFY_OAUTH_RETURN_TO;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return DEFAULT_SHOPIFY_OAUTH_RETURN_TO;
  }
  if (trimmed.includes("://") || trimmed.includes("\\")) {
    return DEFAULT_SHOPIFY_OAUTH_RETURN_TO;
  }

  try {
    const url = new URL(trimmed, "https://elevate.local");
    if (url.origin !== "https://elevate.local") return DEFAULT_SHOPIFY_OAUTH_RETURN_TO;
    const path = url.pathname;
    const step = url.searchParams.get("step");
    if (path === "/connections/shopify") {
      const err = url.searchParams.get("error");
      if (err === "oauth") return "/connections/shopify?error=oauth";
      return "/connections/shopify";
    }
    if (path === "/onboarding") {
      if (step === "store" || step === "orders" || step === "configuration") {
        return "/onboarding?step=configuration";
      }
      if (step === "whatsapp" || step === "ready") {
        return `/onboarding?step=${step}`;
      }
      return "/onboarding?step=configuration";
    }
  } catch {
    return DEFAULT_SHOPIFY_OAUTH_RETURN_TO;
  }

  if (ALLOWED_EXACT.has(trimmed)) {
    if (trimmed.includes("step=store") || trimmed.includes("step=orders")) {
      return "/onboarding?step=configuration";
    }
    return trimmed;
  }
  return DEFAULT_SHOPIFY_OAUTH_RETURN_TO;
}

export function shopifyOauthErrorReturnTo(returnTo: string): string {
  const safe = sanitizeShopifyOauthReturnTo(returnTo);
  if (safe.startsWith("/onboarding")) {
    return "/onboarding?step=configuration&error=oauth";
  }
  return "/connections/shopify?error=oauth";
}

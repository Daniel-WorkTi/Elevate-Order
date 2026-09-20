import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";

import { completeShopifyInstall } from "@/lib/integrations/shopify/oauth.functions";
import {
  DEFAULT_SHOPIFY_OAUTH_RETURN_TO,
  sanitizeShopifyOauthReturnTo,
  shopifyOauthErrorReturnTo,
} from "@/lib/integrations/shopify/oauth-return-to";
import { useT } from "@/lib/i18n/locale-context";

function stringParams(search: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(search)) {
    if (typeof value === "string") params[key] = value;
  }
  return params;
}

function pathAndSearch(target: string): { to: string; search?: Record<string, string> } {
  const url = new URL(target, "https://elevate.local");
  const search: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    search[key] = value;
  });
  return Object.keys(search).length > 0
    ? { to: url.pathname, search }
    : { to: url.pathname };
}

export const Route = createFileRoute("/auth/shopify/callback")({
  validateSearch: (search: Record<string, unknown>) => stringParams(search),
  beforeLoad: async ({ search }) => {
    const fallbackError = shopifyOauthErrorReturnTo(DEFAULT_SHOPIFY_OAUTH_RETURN_TO);

    if (
      search["error"] ||
      !search["shop"] ||
      !search["code"] ||
      !search["state"] ||
      !search["hmac"]
    ) {
      throw redirect(pathAndSearch(fallbackError));
    }

    try {
      const result = await completeShopifyInstall({
        data: {
          shop: search["shop"],
          code: search["code"],
          state: search["state"],
          hmac: search["hmac"],
          query: new URLSearchParams(search).toString(),
        },
      });
      const returnTo = sanitizeShopifyOauthReturnTo(result.returnTo);
      throw redirect(pathAndSearch(returnTo));
    } catch (error) {
      if (isRedirect(error)) throw error;
      throw redirect(pathAndSearch(fallbackError));
    }
  },
  component: ShopifyCallbackPending,
});

function ShopifyCallbackPending() {
  const t = useT();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F7F8FA]">
      <p className="text-[14px] text-[#667085]">{t("auth.signingIn")}</p>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { startShopifyInstall } from "@/lib/integrations/shopify/oauth.functions";
import {
  sanitizeShopifyOauthReturnTo,
  shopifyOauthErrorReturnTo,
} from "@/lib/integrations/shopify/oauth-return-to";
import { useT } from "@/lib/i18n/locale-context";

type ShopifyStartSearch = {
  shop?: string;
  workspaceId?: string;
  returnTo?: string;
};

export const Route = createFileRoute("/auth/shopify")({
  validateSearch: (search: Record<string, unknown>): ShopifyStartSearch => {
    const result: ShopifyStartSearch = {};
    if (typeof search["shop"] === "string") result.shop = search["shop"];
    if (typeof search["workspaceId"] === "string") result.workspaceId = search["workspaceId"];
    if (typeof search["returnTo"] === "string") result.returnTo = search["returnTo"];
    return result;
  },
  component: ShopifyAuthStart,
});

function ShopifyAuthStart() {
  const search = Route.useSearch();
  const t = useT();

  useEffect(() => {
    const shop = search.shop;
    const workspaceId = search.workspaceId;
    const returnTo = sanitizeShopifyOauthReturnTo(search.returnTo);
    if (!shop || !workspaceId) {
      window.location.replace(shopifyOauthErrorReturnTo(returnTo));
      return;
    }

    // Never start OAuth inside Shopify Admin's iframe — cookies are blocked there.
    if (window.top && window.top !== window) {
      window.top.location.replace(window.location.href);
      return;
    }

    let cancelled = false;
    void startShopifyInstall({
      data: {
        shop,
        returnTo,
        workspaceId,
      },
    })
      .then(({ url }) => {
        if (cancelled) return;
        (window.top ?? window).location.replace(url);
      })
      .catch(() => {
        if (!cancelled) {
          window.location.replace(shopifyOauthErrorReturnTo(returnTo));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [search.shop, search.workspaceId, search.returnTo]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F7F8FA]">
      <p className="text-[14px] text-[#667085]">{t("auth.connecting")}</p>
    </div>
  );
}

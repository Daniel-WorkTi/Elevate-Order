import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { startShopifyInstall } from "@/lib/integrations/shopify/oauth.functions";
import { useT } from "@/lib/i18n/locale-context";

type ShopifyStartSearch = {
  shop?: string;
  workspaceId?: string;
};

export const Route = createFileRoute("/auth/shopify")({
  validateSearch: (search: Record<string, unknown>): ShopifyStartSearch => {
    const result: ShopifyStartSearch = {};
    if (typeof search["shop"] === "string") result.shop = search["shop"];
    if (typeof search["workspaceId"] === "string") result.workspaceId = search["workspaceId"];
    return result;
  },
  component: ShopifyAuthStart,
});

function ShopifyAuthStart() {
  const search = Route.useSearch();
  const t = useT();

  useEffect(() => {
    const shop = search.shop;
    if (!shop) {
      window.location.replace("/connections/shopify");
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
        ...(search.workspaceId ? { workspaceId: search.workspaceId } : {}),
      },
    })
      .then(({ url }) => {
        if (cancelled) return;
        (window.top ?? window).location.replace(url);
      })
      .catch(() => {
        if (!cancelled) {
          window.location.replace("/connections/shopify?error=oauth");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [search.shop, search.workspaceId]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F7F8FA]">
      <p className="text-[14px] text-[#667085]">{t("auth.connecting")}</p>
    </div>
  );
}

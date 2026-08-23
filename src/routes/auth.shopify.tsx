import { createFileRoute, redirect } from "@tanstack/react-router";

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
  beforeLoad: async ({ search }) => {
    if (!search.shop) {
      throw redirect({ to: "/connections/shopify", replace: true });
    }
    let url: string;
    try {
      ({ url } = await startShopifyInstall({
        data: {
          shop: search.shop,
          ...(search.workspaceId ? { workspaceId: search.workspaceId } : {}),
        },
      }));
    } catch {
      throw redirect({
        to: "/connections/shopify",
        search: { error: "oauth" },
        replace: true,
      });
    }
    throw redirect({ href: url });
  },
  component: ShopifyAuthPending,
});

function ShopifyAuthPending() {
  const t = useT();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F7F8FA]">
      <p className="text-[14px] text-[#667085]">{t("auth.connecting")}</p>
    </div>
  );
}

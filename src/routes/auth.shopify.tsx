import { createFileRoute, redirect } from "@tanstack/react-router";

import { startShopifyInstall } from "@/lib/integrations/shopify/oauth.functions";
import { useT } from "@/lib/i18n/locale-context";

type ShopifyStartSearch = {
  shop?: string;
};

export const Route = createFileRoute("/auth/shopify")({
  validateSearch: (search: Record<string, unknown>): ShopifyStartSearch => {
    if (typeof search["shop"] === "string") return { shop: search["shop"] };
    return {};
  },
  beforeLoad: async ({ search }) => {
    if (!search.shop) {
      throw redirect({ to: "/connections/shopify", replace: true });
    }
    let url: string;
    try {
      ({ url } = await startShopifyInstall({ data: { shop: search.shop } }));
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

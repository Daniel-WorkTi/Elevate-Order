import { createFileRoute, redirect } from "@tanstack/react-router";

import { completeShopifyInstall } from "@/lib/integrations/shopify/oauth.functions";
import { useT } from "@/lib/i18n/locale-context";

function stringParams(search: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(search)) {
    if (typeof value === "string") params[key] = value;
  }
  return params;
}

export const Route = createFileRoute("/auth/shopify/callback")({
  validateSearch: (search: Record<string, unknown>) => stringParams(search),
  beforeLoad: async ({ search }) => {
    if (
      search["error"] ||
      !search["shop"] ||
      !search["code"] ||
      !search["state"] ||
      !search["hmac"]
    ) {
      throw redirect({
        to: "/connections/shopify",
        search: { error: "oauth" },
        replace: true,
      });
    }

    try {
      await completeShopifyInstall({
        data: {
          shop: search["shop"],
          code: search["code"],
          state: search["state"],
          hmac: search["hmac"],
          query: new URLSearchParams(search).toString(),
        },
      });
    } catch {
      throw redirect({
        to: "/connections/shopify",
        search: { error: "oauth" },
        replace: true,
      });
    }

    throw redirect({ to: "/connections/shopify", replace: true });
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

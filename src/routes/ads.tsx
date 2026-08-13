import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { MetaAdsPanel } from "@/components/meta-ads-panel";

export const Route = createFileRoute("/ads")({
  head: () => ({
    meta: [
      { title: "Integração Ads — ELEVATE" },
      {
        name: "description",
        content:
          "Conecte a conta de anúncios Meta, configure o gasto diário e acompanhe ROAS, CPA e campanhas da sua operação.",
      },
      { property: "og:title", content: "Integração Ads — ELEVATE" },
      {
        property: "og:description",
        content: "Monitore investimento, ROAS e campanhas Meta ligadas aos seus pedidos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdsPage,
});

function AdsPage() {
  return (
    <AppShell
      title="Integração Ads"
      subtitle="Conecte e monitore sua conta de anúncios Meta — o gasto configurado aqui alimenta o lucro líquido do dashboard."
    >
      <MetaAdsPanel />
    </AppShell>
  );
}

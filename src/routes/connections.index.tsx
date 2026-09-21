import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ConnectionsIntro } from "@/components/connections/workspace/connection-howto";
import { ConnectionRow } from "@/components/connections/workspace/connection-row";
import { WhatsAppLogo } from "@/components/connections/whatsapp/whatsapp-logo";
import { ShopifyLogo } from "@/components/brands/shopify-logo";
import { SupplyMark } from "@/components/supply-logo";
import { useDropeaConnectionPreference } from "@/hooks/use-dropea-connection-preference";
import { useStoreConnectionPreference } from "@/hooks/use-store-connection-preference";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { dropeaStatusLabelKey } from "@/lib/integrations/dropea/dropea-format";
import { applyOperatorDropeaSummary } from "@/lib/integrations/dropea/dropea-operator-status";
import { getDropeaDashboard } from "@/lib/integrations/dropea/dropea.functions";
import { dropiStatusLabelKey } from "@/lib/integrations/dropi/dropi-format";
import { applyOperatorDropiSummary } from "@/lib/integrations/dropi/dropi-operator-status";
import { getDropiDashboard } from "@/lib/integrations/dropi/dropi.functions";
import { getShopifyOauthStatus } from "@/lib/integrations/shopify/oauth.functions";
import { getWhatsAppConnectionStatus } from "@/lib/integrations/whatsapp/whatsapp.functions";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";

export const Route = createFileRoute("/connections/")({
  head: () => ({
    meta: [{ title: metaT("meta.connectionsTitle") }],
  }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const t = useT();
  const { workspaceId } = useWorkspaceId();
  const store = useStoreConnectionPreference(workspaceId);
  const dropea = useDropeaConnectionPreference(workspaceId);
  const shopifyOauth = useQuery({
    queryKey: ["connections", "shopify", "oauth", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      getShopifyOauthStatus({
        data: { workspaceId },
      }),
  });
  const dropiDash = useQuery({
    queryKey: ["connections", "dropi", "dashboard", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => getDropiDashboard({ data: { workspaceId } }),
  });
  const dropeaDash = useQuery({
    queryKey: ["connections", "dropea", "dashboard", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => getDropeaDashboard({ data: { workspaceId } }),
  });
  const whatsappStatus = useQuery({
    queryKey: ["whatsapp", "connection", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => getWhatsAppConnectionStatus({ data: { workspaceId: workspaceId! } }),
  });
  const shopifyLinked = store.linked || Boolean(shopifyOauth.data?.connected);
  const dropiStatus = dropiDash.data?.summary
    ? applyOperatorDropiSummary(dropiDash.data.summary).status
    : "not_configured";
  const dropeaStatus = dropeaDash.data?.summary
    ? applyOperatorDropeaSummary(
        dropeaDash.data.summary,
        dropea.linked,
        dropea.apiTokenConfigured,
        dropea.hmacSecretConfigured,
      ).status
    : dropea.linked && dropea.apiTokenConfigured && dropea.hmacSecretConfigured
      ? "configured"
      : "not_configured";

  const whatsappLinked = whatsappStatus.data?.status === "connected";

  const hubLabel = (
    status: "connected" | "configured" | "error" | "not_configured",
    labelKey: (s: typeof status) => string,
  ) => {
    if (status === "connected") return t("connections.linked");
    if (status === "configured" || status === "error") return t(labelKey(status));
    return t("connections.notConnected");
  };

  const hubTone = (status: "connected" | "configured" | "error" | "not_configured") => {
    if (status === "connected") return "ok" as const;
    if (status === "configured" || status === "error") return "wait" as const;
    return "off" as const;
  };

  return (
    <AppShell title={t("connections.title")} subtitle={t("connections.subtitle")}>
      <div className="space-y-5">
        <ConnectionsIntro />
        <div className="space-y-2">
          <ConnectionRow
            to="/connections/shopify"
            title="Shopify"
            statusLabel={shopifyLinked ? t("connections.linked") : t("connections.notConnected")}
            tone={shopifyLinked ? "ok" : "off"}
            icon={
              <span className="grid size-9 place-items-center overflow-hidden rounded-[10px] border border-[#E6E8EC] bg-white">
                <ShopifyLogo size={28} />
              </span>
            }
          />
          <ConnectionRow
            to="/connections/dropi"
            title="Dropi"
            statusLabel={hubLabel(dropiStatus, dropiStatusLabelKey)}
            tone={hubTone(dropiStatus)}
            icon={<SupplyMark supply="dropi" size={36} className="rounded-[10px]" />}
          />
          <ConnectionRow
            to="/connections/dropea"
            title="Dropea"
            statusLabel={hubLabel(dropeaStatus, dropeaStatusLabelKey)}
            tone={hubTone(dropeaStatus)}
            icon={<SupplyMark supply="dropea" size={36} className="rounded-[10px]" />}
          />
          <ConnectionRow
            to="/connections/whatsapp"
            title="WhatsApp"
            statusLabel={whatsappLinked ? t("connections.linked") : t("connections.notConnected")}
            tone={whatsappLinked ? "ok" : "off"}
            icon={<WhatsAppLogo size={36} className="rounded-[10px]" />}
          />
        </div>
      </div>
    </AppShell>
  );
}

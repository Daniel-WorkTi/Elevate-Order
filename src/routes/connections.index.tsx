import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ConnectionsIntro } from "@/components/connections/workspace/connection-howto";
import { ConnectionRow } from "@/components/connections/workspace/connection-row";
import { SupplyMark } from "@/components/supply-logo";
import shopifyMark from "@/assets/shopify-mark.png";
import { useDropiConnectionPreference } from "@/hooks/use-dropi-connection-preference";
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
  const store = useStoreConnectionPreference();
  const dropi = useDropiConnectionPreference();
  const dropea = useDropeaConnectionPreference();
  const { workspaceId } = useWorkspaceId();
  const shopifyOauth = useQuery({
    queryKey: ["connections", "shopify", "oauth"],
    queryFn: () => getShopifyOauthStatus(),
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
    ? applyOperatorDropiSummary(dropiDash.data.summary, dropi.linked).status
    : dropi.linked
      ? "connected"
      : "not_configured";
  const dropeaStatus = dropeaDash.data?.summary
    ? applyOperatorDropeaSummary(
        dropeaDash.data.summary,
        dropea.linked,
        dropea.apiTokenConfigured,
        dropea.hmacSecretConfigured,
      ).status
    : dropea.linked && dropea.apiTokenConfigured && dropea.hmacSecretConfigured
      ? "connected"
      : "not_configured";

  const dropiLinked = dropiStatus === "connected" || dropiStatus === "configured";
  const dropeaLinked = dropeaStatus === "connected" || dropeaStatus === "configured";
  const whatsappLinked = whatsappStatus.data?.status === "connected";

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
                <img
                  src={shopifyMark}
                  alt=""
                  width={20}
                  height={20}
                  className="size-5 object-contain"
                />
              </span>
            }
          />
          <ConnectionRow
            to="/connections/dropi"
            title="Dropi"
            statusLabel={
              dropiStatus === "error"
                ? t(dropiStatusLabelKey(dropiStatus))
                : dropiLinked
                  ? t("connections.linked")
                  : t("connections.notConnected")
            }
            tone={dropiStatus === "error" ? "wait" : dropiLinked ? "ok" : "off"}
            icon={<SupplyMark supply="dropi" size={36} className="rounded-[10px]" />}
          />
          <ConnectionRow
            to="/connections/dropea"
            title="Dropea"
            statusLabel={
              dropeaStatus === "error"
                ? t(dropeaStatusLabelKey(dropeaStatus))
                : dropeaLinked
                  ? t("connections.linked")
                  : t("connections.notConnected")
            }
            tone={dropeaStatus === "error" ? "wait" : dropeaLinked ? "ok" : "off"}
            icon={<SupplyMark supply="dropea" size={36} className="rounded-[10px]" />}
          />
          <ConnectionRow
            to="/connections/whatsapp"
            title="WhatsApp"
            statusLabel={whatsappLinked ? t("connections.linked") : t("connections.notConnected")}
            tone={whatsappLinked ? "ok" : "off"}
            icon={
              <span className="grid size-9 place-items-center rounded-[10px] border border-[#A6F4C5] bg-[#ECFDF3] text-[#128C7E]">
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                  />
                </svg>
              </span>
            }
          />
        </div>
      </div>
    </AppShell>
  );
}

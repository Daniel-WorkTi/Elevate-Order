import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { WhatsAppConnectPanel } from "@/components/connections/whatsapp/whatsapp-connect-panel";
import { WhatsAppAutoConfirmToggle } from "@/components/connections/whatsapp/whatsapp-auto-confirm-toggle";
import { WhatsAppConfirmationKeywords } from "@/components/connections/whatsapp/whatsapp-confirmation-keywords";
import { WhatsAppLogo } from "@/components/connections/whatsapp/whatsapp-logo";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { getWhatsAppConnectionStatus } from "@/lib/whatsapp/whatsapp.functions";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";

export const Route = createFileRoute("/connections/whatsapp")({
  head: () => ({
    meta: [
      { title: metaT("meta.whatsappTitle") },
      { name: "description", content: metaT("meta.whatsappDescription") },
    ],
  }),
  component: WhatsAppConnectionPage,
});

function WhatsAppConnectionPage() {
  const t = useT();
  const { workspaceId, ready } = useWorkspaceId();

  const statusQuery = useQuery({
    queryKey: ["whatsapp", "connection", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => getWhatsAppConnectionStatus({ data: { workspaceId: workspaceId! } }),
    staleTime: 30_000,
  });

  const connected = statusQuery.data?.status === "connected";
  const reconnecting = statusQuery.data?.status === "reconnecting";

  return (
    <AppShell title={t("connections.whatsappTitle")} subtitle={t("connections.whatsappSubtitle")}>
      <div className="mx-auto max-w-2xl space-y-5">
        <Link
          to="/connections"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#667085] hover:text-[#0A0C10]"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.75} />
          {t("connections.backToConnections")}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <WhatsAppLogo size={40} />
            <p className="min-w-0 pt-1 text-[13px] leading-5 text-[#667085]">
              {connected
                ? t("connections.whatsappConnectedHint")
                : reconnecting
                  ? t("connections.whatsappReconnectingBody")
                  : t("connections.whatsappPageBody")}
            </p>
          </div>
          {connected ? (
            <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-semibold text-emerald-800">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
              {t("connections.linked")}
            </span>
          ) : reconnecting ? (
            <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 text-[12px] font-semibold text-amber-800">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden />
              {t("connections.reconnecting")}
            </span>
          ) : null}
        </div>

        <WhatsAppConnectPanel workspaceId={workspaceId} workspaceReady={ready} />
        <WhatsAppAutoConfirmToggle workspaceId={workspaceId} workspaceReady={ready} />
        <WhatsAppConfirmationKeywords workspaceId={workspaceId} workspaceReady={ready} />
      </div>
    </AppShell>
  );
}

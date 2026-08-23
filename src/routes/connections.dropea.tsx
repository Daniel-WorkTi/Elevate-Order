import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { AppShell } from "@/components/app-shell";
import { ConnectionActivity } from "@/components/connections/workspace/connection-activity";
import { ConnectionHero } from "@/components/connections/workspace/connection-hero";
import { DropeaSetupPanel } from "@/components/connections/dropea/dropea-setup-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useDropeaConnectionPreference } from "@/hooks/use-dropea-connection-preference";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import {
  dropeaStatusClass,
  dropeaStatusLabelKey,
} from "@/lib/integrations/dropea/dropea-format";
import { getDropeaDashboard } from "@/lib/integrations/dropea/dropea.functions";
import { applyOperatorDropeaSummary } from "@/lib/integrations/dropea/dropea-operator-status";
import { getWorkspaceWebhookUrl } from "@/lib/integrations/workspace-webhook.functions";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";

const dropeaDashboardQuery = queryOptions({
  queryKey: ["connections", "dropea", "dashboard"],
  queryFn: () => getDropeaDashboard(),
  placeholderData: keepPreviousData,
});

export const Route = createFileRoute("/connections/dropea")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dropeaDashboardQuery),
  head: () => ({
    meta: [
      { title: metaT("meta.dropeaTitle") },
      { name: "description", content: metaT("meta.dropeaDescription") },
    ],
  }),
  component: DropeaConnectionPage,
});

function DropeaConnectionPage() {
  const t = useT();
  const query = useQuery(dropeaDashboardQuery);
  const {
    linked,
    apiTokenConfigured,
    hmacSecretConfigured,
    connect,
    disconnect,
  } = useDropeaConnectionPreference();
  const { workspaceId } = useWorkspaceId();
  const data = query.data;
  const loading = query.isPending && !data;
  const credentialsConfigured = apiTokenConfigured && hmacSecretConfigured;

  const webhookQuery = useQuery({
    queryKey: ["workspace-webhook", "dropea", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      getWorkspaceWebhookUrl({
        data: { workspaceId, supply: "dropea" },
      }),
  });

  const summary = useMemo(() => {
    if (!data?.summary) return null;
    return applyOperatorDropeaSummary(
      data.summary,
      linked,
      apiTokenConfigured,
      hmacSecretConfigured,
    );
  }, [data?.summary, linked, apiTokenConfigured, hmacSecretConfigured]);

  const serverReady = Boolean(data?.summary.serverConfigured);
  const fullyLinked = linked && credentialsConfigured;
  const events = fullyLinked ? (data?.recentEvents ?? []) : [];

  const activity = events.map((event) => ({
    id: event.id,
    title: t("connections.orderUpdated", { id: event.orderId }),
    detail: event.statusName ?? event.details ?? t("connections.dropeaEventDetail"),
    at: event.eventDate,
  }));

  return (
    <AppShell title={t("connections.title")} subtitle="Dropea">
      <div className="space-y-5">
        {loading || !summary ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-[16px]" />
            <Skeleton className="h-40 w-full rounded-[14px]" />
          </div>
        ) : (
          <>
            <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
              <ConnectionHero
                supply="dropea"
                title="Dropea"
                subtitle={t("connections.dropeaSubtitle")}
                statusLabel={t(dropeaStatusLabelKey(summary.status))}
                statusClass={dropeaStatusClass(summary.status)}
                methodLabel={t("connections.methodApi")}
              />
            </section>

            <DropeaSetupPanel
              linked={linked}
              apiTokenConfigured={apiTokenConfigured}
              hmacSecretConfigured={hmacSecretConfigured}
              serverReady={serverReady}
              webhookUrl={webhookQuery.data?.webhookUrl ?? ""}
              loadingUrl={webhookQuery.isPending || !workspaceId}
              urlError={
                webhookQuery.isError ? t("connections.webhookUrlError") : null
              }
              onConnect={connect}
              onDisconnect={disconnect}
            />

            {fullyLinked ? (
              <ConnectionActivity
                items={activity}
                emptyLabel={t("connections.emptyDropeaActivity")}
              />
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}

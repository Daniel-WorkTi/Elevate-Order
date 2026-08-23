import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { AppShell } from "@/components/app-shell";
import { ConnectionActivity } from "@/components/connections/workspace/connection-activity";
import { ConnectionHero } from "@/components/connections/workspace/connection-hero";
import { DropiSetupPanel } from "@/components/connections/dropi/dropi-setup-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useDropiConnectionPreference } from "@/hooks/use-dropi-connection-preference";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import {
  dropiStatusClass,
  dropiStatusDotClass,
  dropiStatusLabelKey,
} from "@/lib/integrations/dropi/dropi-format";
import { getDropiDashboard } from "@/lib/integrations/dropi/dropi.functions";
import { applyOperatorDropiSummary } from "@/lib/integrations/dropi/dropi-operator-status";
import { getWorkspaceWebhookUrl } from "@/lib/integrations/workspace-webhook.functions";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";

const dropiDashboardQuery = queryOptions({
  queryKey: ["connections", "dropi", "dashboard"],
  queryFn: () => getDropiDashboard(),
  placeholderData: keepPreviousData,
});

export const Route = createFileRoute("/connections/dropi")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dropiDashboardQuery),
  head: () => ({
    meta: [
      { title: metaT("meta.dropiTitle") },
      { name: "description", content: metaT("meta.dropiDescription") },
    ],
  }),
  component: DropiConnectionPage,
});

function DropiConnectionPage() {
  const t = useT();
  const query = useQuery(dropiDashboardQuery);
  const { linked, connect, disconnect } = useDropiConnectionPreference();
  const { workspaceId } = useWorkspaceId();
  const data = query.data;
  const loading = query.isPending && !data;

  const webhookQuery = useQuery({
    queryKey: ["workspace-webhook", "dropi", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      getWorkspaceWebhookUrl({
        data: { workspaceId, supply: "dropi" },
      }),
  });

  const summary = useMemo(() => {
    if (!data?.summary) return null;
    return applyOperatorDropiSummary(data.summary, linked);
  }, [data?.summary, linked]);

  const events = linked ? (data?.recentEvents ?? []) : [];
  const serverReady = Boolean(
    data?.summary.serverConfigured && data?.summary.authConfigured,
  );

  const activity = events.slice(0, 5).map((event) => ({
    id: event.id,
    title: t("connections.orderUpdated", { id: event.orderId }),
    detail: event.statusName ?? event.details ?? t("connections.dropiWebhookDetail"),
    at: event.eventDate,
  }));

  return (
    <AppShell title={t("connections.title")} subtitle="Dropi Pro">
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
                supply="dropi"
                title="Dropi Pro"
                subtitle={t("connections.dropiSubtitle")}
                statusLabel={t(dropiStatusLabelKey(summary.status))}
                statusClass={dropiStatusClass(summary.status)}
                statusDotClass={dropiStatusDotClass(summary.status)}
                methodLabel={t("connections.methodWebhook")}
              />
            </section>

            <DropiSetupPanel
              webhookUrl={webhookQuery.data?.webhookUrl ?? ""}
              loadingUrl={webhookQuery.isPending || !workspaceId}
              urlError={
                webhookQuery.isError ? t("connections.webhookUrlError") : null
              }
              serverReady={serverReady}
              linked={linked}
              onConnect={connect}
              onDisconnect={disconnect}
            />

            {linked ? (
              <ConnectionActivity
                items={activity}
                emptyLabel={t("connections.emptyDropiActivity")}
              />
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}

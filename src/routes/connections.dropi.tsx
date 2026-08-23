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

function dropiDashboardQuery(workspaceId: string) {
  return queryOptions({
    queryKey: ["connections", "dropi", "dashboard", workspaceId],
    queryFn: () => getDropiDashboard({ data: { workspaceId } }),
    enabled: Boolean(workspaceId),
    placeholderData: keepPreviousData,
  });
}

export const Route = createFileRoute("/connections/dropi")({
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
  const { linked, connect, disconnect } = useDropiConnectionPreference();
  const { workspaceId } = useWorkspaceId();
  const query = useQuery(dropiDashboardQuery(workspaceId));
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
    <AppShell title={t("connections.title")}>
      <div className="space-y-5">
        {loading || !summary ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-[16px]" />
            <Skeleton className="h-40 w-full rounded-[14px]" />
          </div>
        ) : (
          <>
            <ConnectionHero
              supply="dropi"
              title="Dropi"
              statusLabel={t(dropiStatusLabelKey(summary.status))}
              statusClass={dropiStatusClass(summary.status)}
              statusDotClass={dropiStatusDotClass(summary.status)}
            />

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

            {linked && activity.length > 0 ? (
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

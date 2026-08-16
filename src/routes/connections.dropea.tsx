import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ConnectionActivity } from "@/components/connections/workspace/connection-activity";
import { ConnectionAdvancedRow } from "@/components/connections/workspace/connection-advanced-row";
import { ConnectionHero } from "@/components/connections/workspace/connection-hero";
import { ConnectionStatCards } from "@/components/connections/workspace/connection-stat-cards";
import { ConnectionSyncPanel } from "@/components/connections/workspace/connection-sync-panel";
import { buildConnectionStatCards } from "@/components/connections/workspace/build-connection-stats";
import { DropeaApiConfig } from "@/components/connections/dropea/dropea-api-config";
import { DropeaConnectPanel } from "@/components/connections/dropea/dropea-connect-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useDropeaConnectionPreference } from "@/hooks/use-dropea-connection-preference";
import {
  dropeaStatusClass,
  dropeaStatusLabel,
  formatDropeaDateTime,
  formatDropeaMetric,
  formatDropeaRelative,
} from "@/lib/integrations/dropea/dropea-format";
import { getDropeaDashboard } from "@/lib/integrations/dropea/dropea.functions";
import { applyOperatorDropeaSummary } from "@/lib/integrations/dropea/dropea-operator-status";

const dropeaDashboardQuery = queryOptions({
  queryKey: ["connections", "dropea", "dashboard"],
  queryFn: () => getDropeaDashboard(),
  placeholderData: keepPreviousData,
});

export const Route = createFileRoute("/connections/dropea")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dropeaDashboardQuery),
  head: () => ({
    meta: [
      { title: "Dropea — Connections — ELEVATE" },
      {
        name: "description",
        content: "Dropea API connection settings for ELEVATE Orders.",
      },
    ],
  }),
  component: DropeaConnectionPage,
});

function DropeaConnectionPage() {
  const query = useQuery(dropeaDashboardQuery);
  const {
    linked,
    apiTokenConfigured,
    hmacSecretConfigured,
    connect,
    disconnect,
  } = useDropeaConnectionPreference();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const data = query.data;
  const loading = query.isPending && !data;
  const credentialsConfigured = apiTokenConfigured && hmacSecretConfigured;

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

  const stats = useMemo(() => {
    if (!summary) return [];
    const lastSync = summary.lastSyncAt;
    return buildConnectionStatCards({
      lastSyncRelative: formatDropeaRelative(lastSync),
      lastSyncExact: lastSync ? formatDropeaDateTime(lastSync) : "No activity yet",
      orderCount: formatDropeaMetric(summary.orderCount),
      supplyLabel: "Dropea",
      status: summary.status,
      ...(summary.errorMessage ? { errorMessage: summary.errorMessage } : {}),
    });
  }, [summary]);

  const activity = events.map((event) => ({
    id: event.id,
    title: `Order #${event.orderId} updated`,
    detail: event.statusName ?? event.details ?? "Dropea event received",
    at: event.eventDate,
  }));

  return (
    <AppShell title="Connections" subtitle="Dropi webhook and Dropea API">
      <div className="space-y-5">
        {loading || !summary ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-16 w-full rounded-[16px]" />
            <Skeleton className="h-24 w-full rounded-[14px]" />
          </div>
        ) : (
          <section className="space-y-4 rounded-[16px] border border-[#E6E8EC] bg-white p-5">
            <ConnectionHero
              supply="dropea"
              title="Dropea"
              subtitle="API synchronization"
              statusLabel={dropeaStatusLabel(summary.status)}
              statusClass={dropeaStatusClass(summary.status)}
              methodLabel="API"
            />
            <ConnectionStatCards cards={stats} />
          </section>
        )}

        {summary && !loading && !fullyLinked ? (
          <DropeaConnectPanel
            linked={linked}
            apiTokenConfigured={apiTokenConfigured}
            hmacSecretConfigured={hmacSecretConfigured}
            status={summary.status}
            serverReady={serverReady}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        ) : null}

        {summary && fullyLinked ? (
          <ConnectionSyncPanel
            title="Synchronization"
            description="ELEVATE is connected to your Dropea account and importing orders as events arrive."
            checks={[
              { label: "Connection active", ok: fullyLinked },
              {
                label: summary.lastSyncAt
                  ? `Last successful sync ${formatDropeaRelative(summary.lastSyncAt)}`
                  : "Waiting for the first sync",
                ok: Boolean(summary.lastSyncAt),
              },
              {
                label:
                  summary.status === "error"
                    ? "Synchronization has problems"
                    : "No synchronization problems",
                ok: summary.status !== "error",
              },
            ]}
            refreshing={query.isFetching}
            onRefresh={() => {
              void query.refetch().then(() => toast.success("Dropea status refreshed"));
            }}
            onTest={() => {
              if (serverReady && fullyLinked) {
                toast.success("Dropea connection is active");
                return;
              }
              toast.error("Dropea is not fully connected yet");
            }}
            onDisconnect={disconnect}
            refreshLabel="Sync now"
          />
        ) : null}

        {fullyLinked ? (
          <ConnectionActivity
            items={activity}
            emptyLabel="No Dropea events received yet."
          />
        ) : null}

        {summary && !loading ? (
          <ConnectionAdvancedRow
            open={advancedOpen}
            onToggle={() => setAdvancedOpen((open) => !open)}
          >
            <DropeaApiConfig
              summary={summary}
              credentialsConfigured={credentialsConfigured}
            />
          </ConnectionAdvancedRow>
        ) : null}
      </div>
    </AppShell>
  );
}

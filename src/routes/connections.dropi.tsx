import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ConnectionActivity } from "@/components/connections/workspace/connection-activity";
import { ConnectionAdvancedRow } from "@/components/connections/workspace/connection-advanced-row";
import { ConnectionHero } from "@/components/connections/workspace/connection-hero";
import { ConnectionStatCards } from "@/components/connections/workspace/connection-stat-cards";
import { ConnectionSyncPanel } from "@/components/connections/workspace/connection-sync-panel";
import { buildConnectionStatCards } from "@/components/connections/workspace/build-connection-stats";
import { DropiConnectPanel } from "@/components/connections/dropi/dropi-connect-panel";
import { DropiConfigurationTab } from "@/components/connections/dropi/dropi-configuration-tab";
import { DropiEventsTable } from "@/components/connections/dropi/dropi-events-table";
import { DropiFieldMapping } from "@/components/connections/dropi/dropi-field-mapping";
import { DropiWebhookConfig } from "@/components/connections/dropi/dropi-webhook-config";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDropiConnectionPreference } from "@/hooks/use-dropi-connection-preference";
import {
  dropiStatusClass,
  dropiStatusLabel,
  formatDropiDateTime,
  formatDropiRelative,
  formatMetricNumber,
} from "@/lib/integrations/dropi/dropi-format";
import { getDropiDashboard } from "@/lib/integrations/dropi/dropi.functions";
import { applyOperatorDropiSummary } from "@/lib/integrations/dropi/dropi-operator-status";

const dropiDashboardQuery = queryOptions({
  queryKey: ["connections", "dropi", "dashboard"],
  queryFn: () => getDropiDashboard(),
  placeholderData: keepPreviousData,
});

export const Route = createFileRoute("/connections/dropi")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dropiDashboardQuery),
  head: () => ({
    meta: [
      { title: "Dropi Pro — Connections — ELEVATE" },
      {
        name: "description",
        content: "Dropi Pro webhook synchronization settings for ELEVATE Orders.",
      },
    ],
  }),
  component: DropiConnectionPage,
});

function DropiConnectionPage() {
  const query = useQuery(dropiDashboardQuery);
  const { linked, connect, disconnect } = useDropiConnectionPreference();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const data = query.data;
  const loading = query.isPending && !data;

  const summary = useMemo(() => {
    if (!data?.summary) return null;
    return applyOperatorDropiSummary(data.summary, linked);
  }, [data?.summary, linked]);

  const events = linked ? (data?.recentEvents ?? []) : [];
  const serverReady = Boolean(
    data?.summary.serverConfigured && data?.summary.authConfigured,
  );
  const hasWebhookTraffic = Boolean(summary?.lastWebhookAt ?? summary?.lastSuccessfulEventAt);

  const stats = useMemo(() => {
    if (!summary) return [];
    const lastSync = summary.lastWebhookAt ?? summary.lastSuccessfulEventAt;
    return buildConnectionStatCards({
      lastSyncRelative: formatDropiRelative(lastSync),
      lastSyncExact: lastSync ? formatDropiDateTime(lastSync) : "No activity yet",
      orderCount: formatMetricNumber(summary.orderCount),
      supplyLabel: "Dropi",
      status: summary.status,
      ...(summary.errorMessage ? { errorMessage: summary.errorMessage } : {}),
      lastSyncLabel: "Last activity",
      waitingHint: "Waiting for the first webhook",
    });
  }, [summary]);

  const activity = events.slice(0, 4).map((event) => ({
    id: event.id,
    title: `Order #${event.orderId} updated`,
    detail: event.statusName ?? event.details ?? "Dropi webhook received",
    at: event.eventDate,
  }));

  const syncDescription = !linked
    ? "Connect this workspace to start receiving Dropi order updates."
    : hasWebhookTraffic
      ? "Dropi is sending order updates to ELEVATE."
      : "Connection is configured. Waiting for the first webhook.";

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
              supply="dropi"
              title="Dropi Pro"
              subtitle="Order update webhooks"
              statusLabel={dropiStatusLabel(summary.status)}
              statusClass={dropiStatusClass(summary.status)}
              methodLabel="Webhook"
            />
            <ConnectionStatCards cards={stats} />
          </section>
        )}

        {summary && !loading && !linked ? (
          <DropiConnectPanel
            serverReady={serverReady}
            onConnect={connect}
            onOpenAdvanced={() => setAdvancedOpen(true)}
          />
        ) : null}

        {summary?.status === "error" && linked ? (
          <div className="flex flex-col gap-3 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 size-4 text-red-600" strokeWidth={1.75} />
              <div>
                <p className="text-[13px] font-semibold text-red-700">
                  Dropi synchronization has errors.
                </p>
                <p className="mt-0.5 text-[12px] text-red-700/80">
                  {summary.errorMessage ?? "The latest webhook could not be processed."}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-[10px] text-[12px] shadow-none"
              onClick={() => setAdvancedOpen(true)}
            >
              Check configuration
            </Button>
          </div>
        ) : null}

        {summary && linked ? (
          <ConnectionSyncPanel
            title="Synchronization"
            description={syncDescription}
            checks={[
              { label: "Workspace linked", ok: linked },
              {
                label: hasWebhookTraffic
                  ? `Last activity ${formatDropiRelative(summary.lastWebhookAt ?? summary.lastSuccessfulEventAt)}`
                  : "Waiting for the first webhook",
                ok: hasWebhookTraffic,
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
            showRefresh={false}
            onRefresh={() => {
              void query.refetch().then(() => toast.success("Dropi status refreshed"));
            }}
            onTest={() => {
              if (serverReady && linked) {
                toast.success(
                  hasWebhookTraffic
                    ? "Dropi connection looks healthy"
                    : "Configured and waiting for the first webhook",
                );
                return;
              }
              toast.error("Dropi is not fully connected yet");
            }}
            onCheckConfiguration={() => setAdvancedOpen(true)}
            onDisconnect={disconnect}
          />
        ) : null}

        {linked ? (
          showAllEvents && data ? (
            <DropiEventsTable events={events} showFilters />
          ) : (
            <ConnectionActivity
              items={activity}
              emptyLabel="No Dropi events received yet."
              {...(events.length > 4
                ? { onViewAll: () => setShowAllEvents(true) }
                : {})}
            />
          )
        ) : null}

        {summary && data && !loading ? (
          <ConnectionAdvancedRow
            open={advancedOpen}
            onToggle={() => setAdvancedOpen((open) => !open)}
          >
            <div className="space-y-5">
              <DropiWebhookConfig summary={summary} />
              <DropiConfigurationTab summary={summary} />
              <DropiFieldMapping fields={data.fields} />
            </div>
          </ConnectionAdvancedRow>
        ) : null}
      </div>
    </AppShell>
  );
}

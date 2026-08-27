import { keepPreviousData, queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import { syncDropeaOrders } from "@/lib/integrations/dropea/sync-dropea-orders";
import { getWorkspaceWebhookUrl } from "@/lib/integrations/workspace-webhook.functions";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";

function dropeaDashboardQuery(workspaceId: string) {
  return queryOptions({
    queryKey: ["connections", "dropea", "dashboard", workspaceId],
    queryFn: () => getDropeaDashboard({ data: { workspaceId } }),
    enabled: Boolean(workspaceId),
    placeholderData: keepPreviousData,
  });
}

export const Route = createFileRoute("/connections/dropea")({
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
  const queryClient = useQueryClient();
  const {
    linked,
    apiTokenConfigured,
    hmacSecretConfigured,
    connect,
    disconnect,
    getApiToken,
  } = useDropeaConnectionPreference();
  const { workspaceId } = useWorkspaceId();
  const query = useQuery(dropeaDashboardQuery(workspaceId));
  const data = query.data;
  const loading = query.isPending && !data;
  const credentialsConfigured = apiTokenConfigured && hmacSecretConfigured;
  const [syncing, setSyncing] = useState(false);

  const webhookQuery = useQuery({
    queryKey: ["workspace-webhook", "dropea", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      getWorkspaceWebhookUrl({
        data: {
          workspaceId,
          supply: "dropea",
          ...(typeof window !== "undefined" &&
          /^https:\/\//i.test(window.location.origin) &&
          !/localhost|127\.0\.0\.1/i.test(window.location.origin)
            ? { publicBaseUrl: window.location.origin }
            : {}),
        },
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
              supply="dropea"
              title="Dropea"
              statusLabel={t(dropeaStatusLabelKey(summary.status))}
              statusClass={dropeaStatusClass(summary.status)}
            />

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
              syncing={syncing}
              onSync={() => {
                const token = getApiToken();
                if (!token || !workspaceId) {
                  toast.error(t("connections.enterBothToConnect"));
                  return;
                }
                setSyncing(true);
                void syncDropeaOrders({ data: { workspaceId, apiToken: token } })
                  .then((result) => {
                    if (!result.ok) {
                      toast.error(result.message ?? t("connections.syncFailed"));
                      return;
                    }
                    toast.success(
                      t("connections.syncDropeaSuccess", { count: result.imported }),
                    );
                    void queryClient.invalidateQueries({
                      queryKey: ["connections", "dropea"],
                    });
                  })
                  .catch(() => toast.error(t("connections.syncFailed")))
                  .finally(() => setSyncing(false));
              }}
            />

            {fullyLinked && activity.length > 0 ? (
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Unplug } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  WhatsAppConnectButton,
  WhatsAppQrPanel,
} from "@/components/connections/whatsapp/whatsapp-qr-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  disconnectWhatsApp,
  getWhatsAppConnectionStatus,
  startWhatsAppConnect,
} from "@/lib/whatsapp/whatsapp.functions";
import { formatDate, parseDisplayDate } from "@/lib/i18n/date-locale";
import { useI18n, useT } from "@/lib/i18n/locale-context";

type WhatsAppConnectPanelProps = {
  workspaceId: string | null;
  workspaceReady?: boolean;
  compact?: boolean;
};

function connectionLabel(input: {
  verifiedName: string | null | undefined;
  displayPhoneNumber: string | null | undefined;
}): string {
  if (input.verifiedName?.trim()) return input.verifiedName.trim();
  if (input.displayPhoneNumber?.trim()) return input.displayPhoneNumber.trim();
  return "—";
}

export function WhatsAppConnectPanel({
  workspaceId,
  workspaceReady = true,
  compact,
}: WhatsAppConnectPanelProps) {
  const t = useT();
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const [eventsUrl, setEventsUrl] = useState<string | null>(null);
  const eventsUrlRef = useRef<string | null>(null);

  useEffect(() => {
    eventsUrlRef.current = eventsUrl;
  }, [eventsUrl]);

  const statusQuery = useQuery({
    queryKey: ["whatsapp", "connection", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => getWhatsAppConnectionStatus({ data: { workspaceId: workspaceId! } }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const connectMutation = useMutation({
    mutationFn: startWhatsAppConnect,
    onSuccess: (result) => {
      setEventsUrl(result.eventsUrl);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("connections.whatsappConnectFailed"));
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectWhatsApp,
    onSuccess: async () => {
      setEventsUrl(null);
      await queryClient.invalidateQueries({ queryKey: ["whatsapp", "connection", workspaceId] });
      toast.success(t("connections.whatsappDisconnectedToast"));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("connections.whatsappDisconnectFailed"),
      );
    },
  });

  useEffect(() => {
    if (!workspaceId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const invalidateStatus = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["whatsapp", "connection", workspaceId] });
      }, 750);
    };

    const channel = supabase
      .channel(`whatsapp-connection-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_connections",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const nextStatus = (payload.new as { status?: string } | null)?.status;
          const prevStatus = (payload.old as { status?: string } | null)?.status;
          if (nextStatus === prevStatus) return;

          if (
            eventsUrlRef.current &&
            (nextStatus === "qr_ready" ||
              nextStatus === "connecting" ||
              nextStatus === "initializing" ||
              nextStatus === "reconnecting")
          ) {
            return;
          }

          invalidateStatus();
        },
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);

  const status = statusQuery.data;
  const connected = status?.status === "connected";
  const reconnecting = status?.status === "reconnecting";
  const pairingActive = connectMutation.isPending || Boolean(eventsUrl);
  const staleDbPairing =
    !pairingActive &&
    !reconnecting &&
    (status?.status === "initializing" ||
      status?.status === "qr_ready" ||
      status?.status === "connecting");

  const primaryLine = connectionLabel({
    verifiedName: status?.verifiedName,
    displayPhoneNumber: status?.displayPhoneNumber,
  });
  const showPhoneSecondary =
    Boolean(status?.verifiedName?.trim()) && Boolean(status?.displayPhoneNumber?.trim());
  const connectedOn = parseDisplayDate(status?.connectedAt);

  if (!workspaceReady) {
    return (
      <div className={compact ? "space-y-3" : "space-y-4"}>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-full max-w-xs rounded-[10px]" />
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <p className="text-[13px] text-[#667085]">{t("connections.whatsappWorkspaceRequired")}</p>
    );
  }

  if (!status?.configured && !statusQuery.isLoading) {
    return <p className="text-[13px] text-[#667085]">{t("connections.whatsappNotConfigured")}</p>;
  }

  if (reconnecting) {
    return (
      <section className="rounded-[14px] border border-[#E6E8EC] bg-white px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
          {t("connections.whatsappReconnectingTitle")}
        </p>
        <p className="mt-2 text-[13px] leading-5 text-[#667085]">
          {t("connections.whatsappReconnectingBody")}
        </p>
        {(status?.verifiedName || status?.displayPhoneNumber) && (
          <div className="mt-4 border-t border-[#E6E8EC] pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
              {t("connections.whatsappAccountLabel")}
            </p>
            <p className="mt-1 truncate text-[16px] font-semibold text-[#0A0C10]">{primaryLine}</p>
            {showPhoneSecondary ? (
              <p className="mt-0.5 text-[13px] text-[#667085]">{status?.displayPhoneNumber}</p>
            ) : null}
          </div>
        )}
      </section>
    );
  }

  if (connected) {
    return (
      <section className="rounded-[14px] border border-[#E6E8EC] bg-white px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
          {t("connections.whatsappAccountLabel")}
        </p>
        <p className="mt-1 truncate text-[16px] font-semibold text-[#0A0C10]">{primaryLine}</p>
        {showPhoneSecondary ? (
          <p className="mt-0.5 text-[13px] text-[#667085]">{status?.displayPhoneNumber}</p>
        ) : null}
        {status?.connectionId ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6E8EC] pt-4">
            <p className="text-[13px] text-[#667085]">
              {connectedOn
                ? t("connections.whatsappConnectedOn", {
                    date: formatDate(connectedOn, locale),
                  })
                : t("connections.whatsappConnectedOnUnknown")}
            </p>
            <Button
              type="button"
              disabled={disconnectMutation.isPending}
              onClick={() =>
                disconnectMutation.mutate({
                  data: { workspaceId, connectionId: status.connectionId! },
                })
              }
              className="h-9 rounded-[10px] bg-[#DC2626] px-4 text-[13px] font-medium text-white shadow-none hover:bg-[#B91C1C] disabled:bg-[#DC2626]"
            >
              <Unplug className="mr-1.5 size-3.5" strokeWidth={1.75} />
              {disconnectMutation.isPending
                ? t("connections.whatsappDisconnecting")
                : t("connections.whatsappDisconnect")}
            </Button>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {!compact ? (
        <p className="text-[13px] leading-5 text-[#667085]">
          {t("connections.whatsappPanelIntro")}
        </p>
      ) : null}
      {staleDbPairing ? (
        <p className="text-[13px] text-[#667085]">{t("connections.whatsappStalePairingHint")}</p>
      ) : null}
      {!eventsUrl ? (
        <WhatsAppConnectButton
          loading={connectMutation.isPending}
          disabled={pairingActive && !connectMutation.isPending}
          onConnect={() => connectMutation.mutate({ data: { workspaceId } })}
        />
      ) : null}
      {eventsUrl ? (
        <WhatsAppQrPanel
          eventsUrl={eventsUrl}
          connecting={pairingActive}
          onConnected={async () => {
            setEventsUrl(null);
            await queryClient.invalidateQueries({
              queryKey: ["whatsapp", "connection", workspaceId],
            });
            toast.success(t("connections.whatsappConnectedToast"));
          }}
          onError={(message) => {
            setEventsUrl(null);
            void queryClient.invalidateQueries({
              queryKey: ["whatsapp", "connection", workspaceId],
            });
            toast.error(message);
          }}
        />
      ) : null}
    </div>
  );
}

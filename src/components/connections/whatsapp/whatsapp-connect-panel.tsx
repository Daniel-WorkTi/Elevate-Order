import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { WhatsAppEmbeddedSignupButton } from "@/components/connections/whatsapp/whatsapp-embedded-signup";
import { Skeleton } from "@/components/ui/skeleton";
import {
  completeWhatsAppEmbeddedSignup,
  getWhatsAppConnectionStatus,
  getWhatsAppPublicConfigFn,
} from "@/lib/integrations/whatsapp/whatsapp.functions";
import { useT } from "@/lib/i18n/locale-context";

type WhatsAppConnectPanelProps = {
  workspaceId: string | null;
  workspaceReady?: boolean;
  compact?: boolean;
};

export function WhatsAppConnectPanel({
  workspaceId,
  workspaceReady = true,
  compact,
}: WhatsAppConnectPanelProps) {
  const t = useT();
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ["whatsapp", "public-config"],
    queryFn: () => getWhatsAppPublicConfigFn(),
    retry: false,
  });

  const statusQuery = useQuery({
    queryKey: ["whatsapp", "connection", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => getWhatsAppConnectionStatus({ data: { workspaceId: workspaceId! } }),
  });

  const completeMutation = useMutation({
    mutationFn: completeWhatsAppEmbeddedSignup,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["whatsapp", "connection", workspaceId] });
      toast.success(t("connections.whatsappConnectedToast"));
      void result;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("connections.whatsappConnectFailed"));
    },
  });

  const config = configQuery.data;
  const status = statusQuery.data;
  const connected = status?.status === "connected";
  const connecting = completeMutation.isPending || status?.status === "pending";
  const configured = configQuery.isSuccess && Boolean(config?.appId && config?.configId);

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
      <p className="text-[13px] text-muted-foreground">
        {t("connections.whatsappWorkspaceRequired")}
      </p>
    );
  }

  if (configQuery.isError || !configured) {
    return (
      <p className="text-[13px] text-muted-foreground">{t("connections.whatsappNotConfigured")}</p>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <h3 className="text-[16px] font-semibold text-foreground">
          {t("connections.whatsappTitle")}
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {t("connections.whatsappPanelIntro")}
        </p>
      </div>

      {connected ? (
        <div className="rounded-[12px] border border-[#A6F4C5] bg-[#ECFDF3] px-4 py-3">
          <p className="text-[14px] font-medium text-[#027A48]">
            <span aria-hidden className="mr-1.5">
              ●
            </span>
            {t("connections.whatsappConnectedTitle")}
          </p>
          {status?.verifiedName ? (
            <p className="mt-1 text-[13px] text-[#027A48]/90">{status.verifiedName}</p>
          ) : null}
          {status?.displayPhoneNumber ? (
            <p className="mt-0.5 text-[13px] text-[#027A48]/85">{status.displayPhoneNumber}</p>
          ) : null}
          <p className="mt-2 text-[12px] text-[#027A48]/75">
            {t("connections.whatsappOfficialMeta")}
          </p>
        </div>
      ) : (
        <>
          <WhatsAppEmbeddedSignupButton
            appId={config!.appId}
            configId={config!.configId}
            disabled={connecting}
            connectLabel={t("connections.whatsappConnect")}
            loadingLabel={t("connections.whatsappConnecting")}
            onComplete={({ code, session }) => {
              completeMutation.mutate({
                data: {
                  workspaceId,
                  code,
                  wabaId: session.wabaId,
                  phoneNumberId: session.phoneNumberId,
                  metaBusinessId: session.businessId,
                },
              });
            }}
            onCancel={() => {
              toast.message(t("connections.whatsappCancelled"));
            }}
            onError={(message) => toast.error(message)}
          />
          <p className="text-[12px] text-muted-foreground">
            {t("connections.whatsappOfficialMeta")}
          </p>
        </>
      )}
    </div>
  );
}

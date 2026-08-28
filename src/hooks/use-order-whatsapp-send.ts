import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { useT } from "@/lib/i18n/locale-context";
import type { OperationalOrder } from "@/lib/order-domain";
import {
  canSendWhatsAppInApp,
  showWhatsAppMeFallback,
  usesWhatsAppGateway,
} from "@/lib/whatsapp/send-mode";
import {
  getWhatsAppConnectionStatus,
  sendWhatsAppMessage,
} from "@/lib/whatsapp/whatsapp.functions";
import { whatsAppSendErrorMessage } from "@/lib/whatsapp/send-error-message";

type SendUiState = "idle" | "sending" | "sent" | "error";

export function useOrderWhatsAppSend({
  order,
  message,
  phone,
  workspaceId,
}: {
  order: OperationalOrder;
  message: string;
  phone: string | null;
  workspaceId: string | null | undefined;
}) {
  const t = useT();
  const [sendState, setSendState] = useState<SendUiState>("idle");
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);
  const [clientMessageId, setClientMessageId] = useState<string | null>(null);

  const whatsappQuery = useQuery({
    queryKey: ["whatsapp", "connection", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => getWhatsAppConnectionStatus({ data: { workspaceId: workspaceId! } }),
    staleTime: 30_000,
  });

  const connection = whatsappQuery.data;
  const gatewayMode = usesWhatsAppGateway(connection);
  const canSendInApp = canSendWhatsAppInApp(connection, Boolean(phone) && Boolean(workspaceId));
  const showWaMeFallback = showWhatsAppMeFallback(connection, Boolean(phone));

  const sendMutation = useMutation({
    mutationFn: sendWhatsAppMessage,
    onSuccess: (result) => {
      if (result.status === "sent") {
        setSendState("sent");
        toast.success(t("orders.detail.messageSent"));
        if (result.deliveryHint === "recipient_is_connected_account") {
          toast.info(t("orders.detail.messageSentToSelfHint"), { duration: 8000 });
        }
      } else if (result.status === "failed") {
        setSendState("error");
        setSendErrorMessage(t("orders.detail.messageSendFailed"));
      } else {
        setSendState("sending");
      }
    },
    onError: (error) => {
      const message = whatsAppSendErrorMessage(error, t("orders.detail.messageSendFailed"));
      setSendErrorMessage(message);
      setSendState("error");
      toast.error(message);
    },
  });

  function ensureClientMessageId(): string {
    if (clientMessageId) return clientMessageId;
    const id = crypto.randomUUID();
    setClientMessageId(id);
    return id;
  }

  function handleSend() {
    if (!workspaceId || !phone || sendMutation.isPending) return;
    setSendState("sending");
    setSendErrorMessage(null);
    sendMutation.mutate({
      data: {
        workspaceId,
        orderId: order.id,
        clientMessageId: ensureClientMessageId(),
        recipientPhone: order.phone ?? phone,
        text: message,
      },
    });
  }

  function handleRetry() {
    if (!clientMessageId) {
      setClientMessageId(crypto.randomUUID());
    }
    handleSend();
  }

  const sendDisabled =
    !message.trim() || sendMutation.isPending || sendState === "sent" || !canSendInApp;

  return {
    connection,
    gatewayMode,
    canSendInApp,
    showWaMeFallback,
    sendState,
    sendErrorMessage,
    sendMutation,
    sendDisabled,
    handleSend,
    handleRetry,
    resetSendState: () => {
      setSendState("idle");
      setSendErrorMessage(null);
      setClientMessageId(null);
    },
  };
}

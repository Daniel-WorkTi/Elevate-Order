import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
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
  const queryClient = useQueryClient();
  const [sendState, setSendState] = useState<SendUiState>("idle");
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);
  /** Stable across rapid double-clicks before React state commits. */
  const clientMessageIdRef = useRef<string | null>(null);
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
    onSuccess: async (result) => {
      if (result.status === "sent") {
        setSendState("sent");
        toast.success(t("orders.detail.messageSent"));
        if (result.deliveryHint === "recipient_is_connected_account") {
          toast.info(t("orders.detail.messageSentToSelfHint"), { duration: 8000 });
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["order", workspaceId, order.id] }),
          queryClient.invalidateQueries({ queryKey: ["order", workspaceId, order.order_id] }),
          queryClient.invalidateQueries({ queryKey: ["orders"] }),
          queryClient.invalidateQueries({ queryKey: ["inbox", "queue", workspaceId] }),
        ]);
      } else if (result.status === "failed") {
        setSendState("error");
        setSendErrorMessage(t("orders.detail.messageSendFailed"));
        toast.error(t("orders.detail.messageSendFailed"));
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
    if (clientMessageIdRef.current) return clientMessageIdRef.current;
    const id = crypto.randomUUID();
    clientMessageIdRef.current = id;
    setClientMessageId(id);
    return id;
  }

  function handleSend() {
    if (!workspaceId || !phone || sendMutation.isPending || sendState === "sending") return;
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
    if (!clientMessageIdRef.current) {
      const id = crypto.randomUUID();
      clientMessageIdRef.current = id;
      setClientMessageId(id);
    }
    handleSend();
  }

  const sendDisabled =
    !canSendInApp ||
    !message.trim() ||
    sendMutation.isPending ||
    sendState === "sending" ||
    sendState === "sent";

  return {
    sendState,
    sendErrorMessage,
    clientMessageId,
    connection,
    gatewayMode,
    canSendInApp,
    showWaMeFallback,
    whatsappQuery,
    sendMutation,
    sendDisabled,
    handleSend,
    handleRetry,
  };
}

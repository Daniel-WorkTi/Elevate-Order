import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Info, MessageCircle, Pencil, RotateCcw } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useI18n, useMessageLanguage, useT } from "@/lib/i18n/locale-context";
import type { OperationalOrder } from "@/lib/order-domain";
import {
  buildWhatsAppLink,
  defaultTemplateLabelFn,
  normalizeWhatsAppPhone,
  pickDefaultTemplate,
  resolveOrderMessage,
  templatesForOrder,
  type MessageTemplateId,
} from "@/lib/order-message";
import type { TemplateKind } from "@/lib/templates";
import { listMessageTemplates } from "@/lib/templates.functions";
import {
  getWhatsAppConnectionStatus,
  sendWhatsAppMessage,
} from "@/lib/whatsapp/whatsapp.functions";
import {
  canSendWhatsAppInApp,
  showWhatsAppMeFallback,
  usesWhatsAppGateway,
} from "@/lib/whatsapp/send-mode";
import { whatsAppSendErrorMessage } from "@/lib/whatsapp/send-error-message";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type SendUiState = "idle" | "sending" | "sent" | "error";

/**
 * Order detail “Mensagem” card — template + preview + send via gateway or wa.me fallback.
 */
export function OrderMessageCard({
  order,
  messageRef,
  className,
}: {
  order: OperationalOrder;
  messageRef?: RefObject<HTMLTextAreaElement | null>;
  className?: string;
}) {
  const t = useT();
  const { locale } = useI18n();
  const messageLanguage = useMessageLanguage();
  const { workspaceId } = useWorkspaceId();
  const templateTriggerId = useId();
  const localMessageRef = useRef<HTMLTextAreaElement | null>(null);
  const defaultId = pickDefaultTemplate(order);
  const [templateId, setTemplateId] = useState<MessageTemplateId>(defaultId);
  const [message, setMessage] = useState("");
  const [selectOpen, setSelectOpen] = useState(false);
  const [sendState, setSendState] = useState<SendUiState>("idle");
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);
  const [clientMessageId, setClientMessageId] = useState<string | null>(null);

  const whatsappQuery = useQuery({
    queryKey: ["whatsapp", "connection", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => getWhatsAppConnectionStatus({ data: { workspaceId: workspaceId! } }),
    staleTime: 30_000,
  });

  const templatesQuery = useQuery({
    queryKey: ["message-templates", messageLanguage, workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      listMessageTemplates({
        data: { language: messageLanguage, ...(workspaceId ? { workspaceId } : {}) },
      }),
  });

  const labelForKind = useMemo(() => defaultTemplateLabelFn(t), [t, locale]);

  const templates = useMemo(() => {
    if (templatesQuery.data?.templates?.length) {
      return templatesQuery.data.templates.map((item) => ({
        id: item.kind as MessageTemplateId,
        label: labelForKind(item.kind as TemplateKind),
        body: item.content,
      }));
    }
    return templatesForOrder(order, messageLanguage, labelForKind);
  }, [templatesQuery.data, order, messageLanguage, labelForKind]);

  const template = templates.find((item) => item.id === templateId) ?? templates[0]!;

  useEffect(() => {
    setTemplateId(pickDefaultTemplate(order));
    setSendState("idle");
    setSendErrorMessage(null);
    setClientMessageId(null);
  }, [order]);

  useEffect(() => {
    setMessage(resolveOrderMessage(template.body, order, messageLanguage, t));
    setSendState("idle");
    setSendErrorMessage(null);
  }, [order, template.body, messageLanguage, t]);

  const phone = normalizeWhatsAppPhone(order.phone);
  const waHref = phone ? buildWhatsAppLink(phone, message) : null;
  const connection = whatsappQuery.data;
  const gatewayMode = usesWhatsAppGateway(connection);
  const canSendInApp = canSendWhatsAppInApp(connection, Boolean(phone) && Boolean(workspaceId));
  const showWaMeFallback = showWhatsAppMeFallback(connection, Boolean(phone));
  const recipientIsConnectedAccount =
    Boolean(phone) &&
    Boolean(connection?.displayPhoneNumber) &&
    phone!.replace(/\D/g, "") === connection!.displayPhoneNumber!.replace(/\D/g, "");

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
    const id = ensureClientMessageId();
    sendMutation.mutate({
      data: {
        workspaceId,
        orderId: order.id,
        clientMessageId: id,
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

  function setTextareaRef(node: HTMLTextAreaElement | null) {
    localMessageRef.current = node;
    if (messageRef) {
      (messageRef as { current: HTMLTextAreaElement | null }).current = node;
    }
  }

  const sendDisabled =
    !message.trim() || sendMutation.isPending || sendState === "sent" || !canSendInApp;

  return (
    <section
      id="order-message-card"
      aria-labelledby="message-heading"
      className={cn(
        "flex min-h-0 flex-1 flex-col rounded-[14px] border border-[#E6E8EC] bg-white p-5 shadow-none",
        className,
      )}
    >
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-[#2563EB]" strokeWidth={1.75} aria-hidden />
          <h2
            id="message-heading"
            className="text-[15px] font-semibold tracking-tight text-[#0A0C10]"
          >
            {t("orders.detail.message")}
          </h2>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-[#2563EB] transition-colors hover:text-[#1D4ED8]"
          onClick={() => setSelectOpen(true)}
        >
          {t("orders.detail.selectTemplate")}
          <ChevronDown className="size-3.5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="mb-3 shrink-0">
        <Select
          value={templateId}
          open={selectOpen}
          onOpenChange={setSelectOpen}
          onValueChange={(value) => setTemplateId(value as MessageTemplateId)}
        >
          <SelectTrigger
            id={templateTriggerId}
            className={cn(
              "h-10 w-full rounded-[10px] border-[#E6E8EC] bg-white px-3 text-[13px] font-medium text-[#0A0C10] shadow-none",
              "focus:ring-2 focus:ring-[#2563EB]/25 data-[placeholder]:text-[#667085]",
              "[&_svg.lucide-chevron-down]:hidden",
            )}
            aria-label={t("orders.detail.selectTemplate")}
          >
            <SelectValue placeholder={t("orders.detail.selectTemplate")} />
            <Pencil className="size-3.5 shrink-0 text-[#98A2B3]" strokeWidth={1.75} aria-hidden />
          </SelectTrigger>
          <SelectContent className="rounded-[10px] border-[#E6E8EC]">
            {templates.map((item) => (
              <SelectItem key={item.id} value={item.id} className="text-[13px]">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative min-h-0 flex-1">
        <Textarea
          ref={setTextareaRef}
          id="order-message"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            if (sendState === "sent") setSendState("idle");
          }}
          rows={7}
          disabled={sendMutation.isPending}
          className={cn(
            "h-full min-h-[160px] w-full resize-none overflow-y-auto rounded-[10px]",
            "border border-[#E6E8EC] bg-white px-3.5 py-3",
            "text-[13px] leading-[1.55] text-[#0A0C10] shadow-none",
            "focus-visible:ring-2 focus-visible:ring-[#2563EB]/25",
          )}
        />
      </div>

      <div className="mt-3 shrink-0 space-y-2">
        {gatewayMode ? (
          <>
            {sendState === "sent" ? (
              <p className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-emerald-700">
                <Check className="size-4" strokeWidth={2} aria-hidden />
                {t("orders.detail.messageSent")}
              </p>
            ) : sendState === "error" ? (
              <div className="space-y-2">
                <p className="text-center text-[13px] text-[#DC2626]">
                  {sendErrorMessage ?? t("orders.detail.messageSendFailed")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full gap-2 rounded-[10px] border-[#E6E8EC] text-[14px] font-medium"
                  onClick={handleRetry}
                >
                  <RotateCcw className="size-4" strokeWidth={1.75} />
                  {t("orders.detail.messageRetry")}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                disabled={sendDisabled}
                onClick={handleSend}
                className="h-11 w-full gap-2 rounded-[10px] bg-[#2563EB] text-[14px] font-medium text-white shadow-none hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                <WhatsAppGlyph className="size-4 shrink-0" />
                {sendMutation.isPending || sendState === "sending"
                  ? t("orders.detail.sendingMessage")
                  : t("orders.detail.sendMessage")}
              </Button>
            )}
            {!canSendInApp && phone ? (
              <p className="text-center text-[12px] text-[#667085]">
                {t("orders.detail.whatsappConnectRequired")}{" "}
                <Link
                  to="/connections/whatsapp"
                  className="font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  {t("nav.connections")}
                </Link>
              </p>
            ) : recipientIsConnectedAccount ? (
              <p className="text-center text-[12px] text-amber-700">
                {t("orders.detail.messageSentToSelfHint")}
              </p>
            ) : null}
          </>
        ) : showWaMeFallback && waHref ? (
          <Button
            asChild
            className="h-11 w-full gap-2 rounded-[10px] bg-[#2563EB] text-[14px] font-medium text-white shadow-none hover:bg-[#1D4ED8]"
          >
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <WhatsAppGlyph className="size-4 shrink-0" />
              {t("orders.detail.openWhatsApp")}
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            disabled
            className="h-11 w-full gap-2 rounded-[10px] bg-[#2563EB] text-[14px] font-medium text-white opacity-50 shadow-none"
          >
            <WhatsAppGlyph className="size-4 shrink-0" />
            {t("orders.detail.openWhatsApp")}
          </Button>
        )}
      </div>

      <p className="mt-2.5 flex shrink-0 items-center gap-1.5 text-[12px] leading-snug text-[#667085]">
        <Info className="size-3.5 shrink-0 text-[#98A2B3]" strokeWidth={1.75} aria-hidden />
        <span>
          {canSendInApp
            ? t("orders.detail.sendViaElevateHint")
            : gatewayMode && phone
              ? t("orders.detail.sendViaElevateHint")
              : phone
                ? t("orders.detail.whatsappOnlyOnClick")
                : t("orders.detail.phoneUnavailable")}
        </span>
      </p>
    </section>
  );
}

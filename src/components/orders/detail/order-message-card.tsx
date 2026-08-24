import { useQuery } from "@tanstack/react-query";
import { Copy, Info, MessageCircle, Pencil } from "lucide-react";
import { useEffect, useMemo, useState, type RefObject } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/locale-context";
import type { OperationalOrder } from "@/lib/order-domain";
import {
  buildWhatsAppLink,
  normalizeWhatsAppPhone,
  pickDefaultTemplate,
  resolveOrderMessage,
  templatesForOrder,
  type MessageTemplateId,
} from "@/lib/order-message";
import { listMessageTemplates } from "@/lib/templates.functions";

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function OrderMessageCard({
  order,
  messageRef,
}: {
  order: OperationalOrder;
  messageRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const t = useT();
  const defaultId = pickDefaultTemplate(order);
  const [templateId, setTemplateId] = useState<MessageTemplateId>(defaultId);
  const [message, setMessage] = useState("");

  const templatesQuery = useQuery({
    queryKey: ["message-templates"],
    queryFn: () => listMessageTemplates(),
  });

  const templates = useMemo(() => {
    if (templatesQuery.data?.templates?.length) {
      return templatesQuery.data.templates.map((item) => ({
        id: item.kind as MessageTemplateId,
        label: item.name,
        body: item.content,
      }));
    }
    return templatesForOrder(order);
  }, [templatesQuery.data, order]);

  const template = templates.find((item) => item.id === templateId) ?? templates[0]!;

  useEffect(() => {
    setTemplateId(pickDefaultTemplate(order));
  }, [order.order_id]);

  useEffect(() => {
    setMessage(resolveOrderMessage(template.body, order));
  }, [order, template.body]);

  const phone = normalizeWhatsAppPhone(order.phone);
  const waHref = phone ? buildWhatsAppLink(phone, message) : null;

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      toast.success(t("orders.detail.messageCopied"));
    } catch {
      toast.error(t("orders.detail.copyMessageFailed"));
    }
  }

  return (
    <section
      id="order-message-card"
      aria-labelledby="message-heading"
      className="rounded-[12px] border border-[#E6E8EC] bg-white p-5 shadow-none"
    >
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="size-4 text-[#667085]" strokeWidth={1.5} aria-hidden />
        <h2 id="message-heading" className="text-[15px] font-semibold text-[#0A0C10]">
          {t("orders.detail.message")}
        </h2>
      </div>

      <div className="relative">
        <Textarea
          ref={messageRef}
          id="order-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          className="min-h-[96px] resize-none rounded-[10px] border-[#E6E8EC] bg-white pb-8 pr-3 text-[13px] leading-relaxed text-[#0A0C10] shadow-none"
        />
        <Pencil
          className="pointer-events-none absolute bottom-3 right-3 size-3.5 text-[#98A2B3]"
          strokeWidth={1.5}
          aria-hidden
        />
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="h-9 shrink-0 rounded-[10px] border-[#E6E8EC] bg-white text-[13px] shadow-none sm:flex-1"
          onClick={() => void copyMessage()}
        >
          <Copy className="size-3.5" strokeWidth={1.5} />
          {t("orders.detail.copyMessage")}
        </Button>

        {waHref ? (
          <Button
            asChild
            className="h-9 rounded-[10px] bg-[color:var(--elevate-blue)] text-[13px] text-white shadow-none hover:bg-[color:var(--elevate-blue-hover)] sm:flex-[1.35]"
          >
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <WhatsAppGlyph className="size-3.5" />
              {t("orders.detail.openWhatsApp")}
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            disabled
            className="h-9 rounded-[10px] bg-[color:var(--elevate-blue)] text-[13px] text-white opacity-50 shadow-none sm:flex-[1.35]"
          >
            <WhatsAppGlyph className="size-3.5" />
            {t("orders.detail.openWhatsApp")}
          </Button>
        )}
      </div>

      <p className="mt-2.5 flex items-start gap-1.5 text-[12px] text-[#667085]">
        <Info className="mt-0.5 size-3.5 shrink-0 text-[#98A2B3]" strokeWidth={1.5} aria-hidden />
        <span>
          {phone ? t("orders.detail.whatsappOnlyOnClick") : t("orders.detail.phoneUnavailable")}
        </span>
      </p>
    </section>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Copy, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ContactHistory } from "@/components/orders/detail/contact-history";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type OperationalOrder } from "@/lib/order-domain";
import {
  availableMessageChips,
  buildWhatsAppLink,
  normalizeWhatsAppPhone,
  pickDefaultTemplate,
  resolveOrderMessage,
  templatesForOrder,
  type MessageTemplateId,
} from "@/lib/order-message";
import { listMessageTemplates } from "@/lib/templates.functions";

export function MessageComposer({ order }: { order: OperationalOrder }) {
  const defaultId = pickDefaultTemplate(order);
  const [templateId, setTemplateId] = useState<MessageTemplateId>(defaultId);
  const [message, setMessage] = useState("");

  const templatesQuery = useQuery({
    queryKey: ["message-templates"],
    queryFn: () => listMessageTemplates(),
  });

  const templates = useMemo(() => {
    if (templatesQuery.data?.templates?.length) {
      return templatesQuery.data.templates.map((t) => ({
        id: t.kind as MessageTemplateId,
        label: t.name,
        body: t.content,
      }));
    }
    return templatesForOrder(order);
  }, [templatesQuery.data, order]);

  const template = templates.find((t) => t.id === templateId) ?? templates[0]!;

  useEffect(() => {
    setTemplateId(pickDefaultTemplate(order));
  }, [order.order_id]);

  useEffect(() => {
    setMessage(resolveOrderMessage(template.body, order));
  }, [order, template.body]);

  const phone = normalizeWhatsAppPhone(order.phone);
  const waHref = phone ? buildWhatsAppLink(phone, message) : null;
  const chips = availableMessageChips(order);
  const preview = message.trim();

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Message copied");
    } catch {
      toast.error("Unable to copy message");
    }
  }

  return (
    <section
      aria-labelledby="contact-heading"
      className="rounded-[16px] border border-border bg-card p-5"
    >
      <div className="space-y-1">
        <h2 id="contact-heading" className="text-[15px] font-semibold text-foreground">
          Contact customer
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Prepare the message using data from this order.
        </p>
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="order-template" className="text-[12px] text-muted-foreground">
          Template
        </Label>
        <Select
          value={templateId}
          onValueChange={(value) => setTemplateId(value as MessageTemplateId)}
        >
          <SelectTrigger id="order-template" className="h-10 rounded-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {templates.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {chips.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Available fields">
          {chips.map((chip) => (
            <span
              key={chip.id}
              title={chip.value}
              className="inline-flex rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {chip.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <Label htmlFor="order-message" className="text-[12px] text-muted-foreground">
          Message
        </Label>
        <Textarea
          id="order-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={10}
          className="min-h-[200px] rounded-[10px] text-[13px] leading-relaxed"
        />
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-[12px] font-medium text-muted-foreground">Preview</p>
        <div className="rounded-[10px] border border-border bg-background px-3.5 py-3 text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">
          {preview || "—"}
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {waHref ? (
          <Button
            asChild
            className="h-10 rounded-[10px] bg-whatsapp text-white shadow-none hover:bg-whatsapp/90"
          >
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" strokeWidth={1.5} />
              Open WhatsApp
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            disabled
            className="h-10 rounded-[10px] bg-whatsapp text-white opacity-50 shadow-none"
          >
            <MessageCircle className="size-4" strokeWidth={1.5} />
            Open WhatsApp
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-[10px] shadow-none"
          onClick={() => void copyMessage()}
        >
          <Copy className="size-4" strokeWidth={1.5} />
          Copy message
        </Button>
      </div>

      {!phone ? (
        <p className="mt-2 text-[12px] text-muted-foreground">Customer phone is unavailable.</p>
      ) : null}

      <div className="mt-6 border-t border-border pt-5">
        <ContactHistory />
      </div>
    </section>
  );
}

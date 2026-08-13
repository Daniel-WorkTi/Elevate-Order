import { MessageCircle, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import {
  formatOrderDate,
  statusLabel,
  suggestedMessage,
  whatsappLink,
  type Order,
} from "@/lib/orders";

export function OrderDetailDialog({
  order,
  onOpenChange,
}: {
  order: Order | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!order) return;
    setMessage(suggestedMessage(order));
  }, [order]);

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-w-lg rounded-2xl">
        {order ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">{order.customer}</DialogTitle>
              <DialogDescription>
                {order.id} · {formatOrderDate(order.date)} · synced from {order.source}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status} label={statusLabel(order)} />
              <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                {order.postalCode} · {order.city}
              </span>
              <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                {order.total.toFixed(2)} €
              </span>
            </div>

            {order.note ? (
              <p className="rounded-xl border border-danger/25 bg-danger/8 p-3 text-sm text-danger">
                {order.note}
              </p>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="wa-message" className="text-sm font-medium">
                Mensagem sugerida
              </label>
              <Textarea
                id="wa-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={7}
                className="rounded-xl bg-card"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                asChild
                className="flex-1 rounded-xl bg-whatsapp text-white hover:bg-whatsapp/90"
                onClick={() => toast.success(`Message opened for ${order.id}`)}
              >
                <a
                  href={whatsappLink(order, message)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="size-4" />
                  Open in WhatsApp
                </a>
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => toast.success("Queued for automated sending")}
              >
                <Send className="size-4" />
                Queue send
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

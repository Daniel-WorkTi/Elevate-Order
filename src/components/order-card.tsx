import { memo } from "react";
import { CalendarDays, MapPin, MessageCircle, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import {
  formatOrderDate,
  statusLabel,
  suggestedMessage,
  whatsappLink,
  type Order,
} from "@/lib/orders";

function OrderCardBase({ order, onOpen }: { order: Order; onOpen: (order: Order) => void }) {
  const message = suggestedMessage(order);
  return (
    <article className="card-lift group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[18px] font-semibold">{order.customer}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {order.postalCode} · {order.city}
          </p>
        </div>
        <StatusBadge status={order.status} label={statusLabel(order)} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Order</dt>
          <dd className="mt-0.5 font-medium">{order.id}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Date</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            {formatOrderDate(order.date)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 truncate rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
        {order.product} · {order.total.toFixed(2)} €
      </p>

      <div className="mt-3 rounded-lg border border-dashed border-border p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Mensagem sugerida
        </p>
        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{message}</p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button asChild className="flex-1 rounded-xl bg-whatsapp text-white hover:bg-whatsapp/90">
          <a href={whatsappLink(order, message)} target="_blank" rel="noreferrer">
            <MessageCircle className="size-4" />
            Enviar mensagem
          </a>
        </Button>
        <Button variant="outline" className="rounded-xl" onClick={() => onOpen(order)}>
          <Receipt className="size-4" />
          Details
        </Button>
      </div>
    </article>
  );
}

export const OrderCard = memo(OrderCardBase);

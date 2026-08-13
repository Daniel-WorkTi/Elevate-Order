import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTimestamp } from "@/lib/format-relative-time";
import {
  formatOrderId,
  formatOrderTotal,
  getOrderSupply,
  safeTrackingHref,
  SUPPLY_LABEL,
} from "@/lib/order-domain";
import { getSyncedOrder } from "@/lib/synced-orders.functions";

export const Route = createFileRoute("/orders/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Order #${params.id} — ELEVATE` }],
  }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { id } = Route.useParams();
  const orderId = Number(id);
  const query = useQuery({
    queryKey: ["order", orderId],
    enabled: Number.isInteger(orderId) && orderId > 0,
    queryFn: () => getSyncedOrder({ data: { orderId } }),
  });

  const order = query.data?.order ?? null;
  const updated = order ? formatRelativeTimestamp(order.last_event_at) : null;
  const trackingHref = order ? safeTrackingHref(order.tracking_url) : null;
  const supply = order ? getOrderSupply(order) : null;

  return (
    <AppShell title={order ? formatOrderId(order) : `Order #${id}`} subtitle="Synchronized order">
      <div className="mb-4">
        <Button asChild variant="ghost" className="h-8 rounded-[8px] px-2 text-[13px]">
          <Link to="/orders">
            <ArrowLeft className="size-3.5" strokeWidth={1.5} />
            Back to Orders
          </Link>
        </Button>
      </div>

      {query.isPending ? (
        <div className="space-y-3 rounded-[16px] border border-border bg-card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {!query.isPending && (query.data?.error || !order) ? (
        <div className="rounded-[16px] border border-border bg-card px-6 py-12 text-center">
          <p className="text-[15px] font-medium">{query.data?.error ?? "Order not found."}</p>
          <Button asChild className="mt-4 h-9 rounded-[10px] text-[13px] shadow-none">
            <Link to="/orders">Back to Orders</Link>
          </Button>
        </div>
      ) : null}

      {!query.isPending && order ? (
        <div className="rounded-[16px] border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-semibold tracking-tight">{formatOrderId(order)}</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {supply ? SUPPLY_LABEL[supply] : order.source}
                {order.shopify_order_id ? ` · Shopify #${order.shopify_order_id}` : ""}
              </p>
            </div>
            <OrderStatusBadge order={order} />
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Customer" value={order.customer_name ?? "—"} />
            <Detail label="Total" value={formatOrderTotal(order) ?? "—"} />
            <Detail label="Shipping" value={order.shipping_company ?? "—"} />
            <Detail label="Updated" value={updated?.relative ?? "—"} title={updated?.exact} />
            <Detail label="Tracking" value={order.tracking_code ?? "—"} mono />
            <Detail label="Details" value={order.details ?? "—"} />
          </dl>

          {trackingHref ? (
            <a
              href={trackingHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex text-[13px] font-medium text-[color:var(--elevate-blue)] hover:underline"
            >
              Open tracking link
            </a>
          ) : null}
        </div>
      ) : null}
    </AppShell>
  );
}

function Detail({
  label,
  value,
  title,
  mono,
}: {
  label: string;
  value: string;
  title?: string | undefined;
  mono?: boolean | undefined;
}) {
  return (
    <div>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd
        className={`mt-1 text-[14px] text-foreground ${mono ? "font-mono text-[13px]" : ""}`}
        title={title}
      >
        {value}
      </dd>
    </div>
  );
}

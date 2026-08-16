import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/app-shell";
import { CustomerSection } from "@/components/orders/detail/customer-section";
import { MessageComposer } from "@/components/orders/detail/message-composer";
import { OrderDetailHeader } from "@/components/orders/detail/order-detail-header";
import { OrderDetailSkeleton } from "@/components/orders/detail/order-detail-skeleton";
import { OrderItemsSection } from "@/components/orders/detail/order-items-section";
import { OrderTimeline } from "@/components/orders/detail/order-timeline";
import { SupplyInformation } from "@/components/orders/detail/supply-information";
import { TrackingSection } from "@/components/orders/detail/tracking-section";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getDemoOrderByOrderId } from "@/lib/inbox/inbox-to-orders";
import { formatOrderId } from "@/lib/order-domain";
import { getSyncedOrder, listOrderEvents } from "@/lib/synced-orders.functions";

export const Route = createFileRoute("/orders/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Order #${params.id} — ELEVATE` }],
  }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { id } = Route.useParams();
  const orderId = Number(id);
  const validId = Number.isInteger(orderId) && orderId > 0;

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    enabled: validId,
    queryFn: () => getSyncedOrder({ data: { orderId } }),
  });

  const syncedOrder = orderQuery.data?.order ?? null;
  const demoOrder =
    !orderQuery.isPending && !syncedOrder && validId ? getDemoOrderByOrderId(orderId) : null;
  const order = syncedOrder ?? demoOrder;

  const eventsQuery = useQuery({
    queryKey: ["order-events", orderId],
    enabled: validId && Boolean(syncedOrder),
    queryFn: () => listOrderEvents({ data: { orderId } }),
  });

  const loadError =
    !validId || demoOrder
      ? null
      : (orderQuery.data?.error ?? (orderQuery.isError ? "Unable to load this order." : null));
  const notFound = validId && !orderQuery.isPending && !loadError && !order;

  return (
    <AppShell
      title={order ? formatOrderId(order) : `Order #${id}`}
      subtitle="Order detail"
    >
      {!validId ? (
        <NotFoundState />
      ) : orderQuery.isPending ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-7 w-48 rounded bg-muted" />
          </div>
          <OrderDetailSkeleton />
        </div>
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void orderQuery.refetch()} />
      ) : notFound || !order ? (
        <NotFoundState />
      ) : (
        <div className="space-y-6">
          <OrderDetailHeader order={order} />

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.95fr)_minmax(300px,1fr)]">
            <div className="order-1 space-y-0 rounded-[16px] border border-border bg-card">
              <div className="p-5 md:p-6">
                <CustomerSection order={order} />
              </div>
              <Separator />
              <div className="p-5 md:p-6">
                <OrderItemsSection order={order} />
              </div>
              <Separator />
              <div className="p-5 md:p-6">
                <SupplyInformation order={order} />
              </div>
              <Separator />
              <div className="p-5 md:p-6">
                <TrackingSection order={order} />
              </div>
              <div className="hidden lg:block">
                <Separator />
                <div className="p-5 md:p-6">
                  <OrderTimeline
                    events={eventsQuery.data?.events ?? []}
                    error={eventsQuery.data?.error ?? null}
                  />
                </div>
              </div>
            </div>

            <aside className="order-2 lg:sticky lg:top-24">
              <MessageComposer order={order} />
            </aside>

            <div className="order-3 rounded-[16px] border border-border bg-card p-5 md:p-6 lg:hidden">
              <OrderTimeline
                events={eventsQuery.data?.events ?? []}
                error={eventsQuery.data?.error ?? null}
              />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function NotFoundState() {
  return (
    <div className="rounded-[16px] border border-border bg-card px-6 py-14 text-center">
      <h2 className="text-[18px] font-semibold tracking-tight text-foreground">Order not found</h2>
      <p className="mt-2 text-[13px] text-muted-foreground">
        This order may have been removed or the URL is incorrect.
      </p>
      <Button asChild className="mt-5 h-9 rounded-[10px] text-[13px] shadow-none">
        <Link to="/orders">Back to Orders</Link>
      </Button>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[16px] border border-border bg-card px-6 py-14 text-center">
      <h2 className="text-[18px] font-semibold tracking-tight text-foreground">
        Unable to load this order.
      </h2>
      <p className="mt-2 text-[13px] text-muted-foreground">{message}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          onClick={onRetry}
          className="h-9 rounded-[10px] text-[13px] shadow-none"
        >
          Retry
        </Button>
        <Button asChild variant="outline" className="h-9 rounded-[10px] text-[13px] shadow-none">
          <Link to="/orders">Back to Orders</Link>
        </Button>
      </div>
    </div>
  );
}

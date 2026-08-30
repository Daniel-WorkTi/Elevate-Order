import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { CodConfirmationPanel } from "@/components/orders/detail/cod-confirmation-panel";
import { CustomerDetailsCard } from "@/components/orders/detail/customer-details-card";
import { OrderDetailHeader } from "@/components/orders/detail/order-detail-header";
import { OrderDetailSkeleton } from "@/components/orders/detail/order-detail-skeleton";
import { OrderMessageCard } from "@/components/orders/detail/order-message-card";
import { OrderProductsCard } from "@/components/orders/detail/order-products-card";
import { OrderProgress } from "@/components/orders/detail/order-progress";
import { OrderSummaryCard } from "@/components/orders/detail/order-summary-card";
import { Button } from "@/components/ui/button";
import { useStoreConnectionPreference } from "@/hooks/use-store-connection-preference";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";
import {
  getOrderDetailPreview,
  getOrderDetailPreviewEvents,
  ORDER_DETAIL_PREVIEW_ID,
} from "@/lib/orders/order-detail-preview";
import { shopifyAdminOrderUrl } from "@/lib/orders/shopify-admin-order-url";
import { confirmOrderCodManual } from "@/lib/orders/confirmation.functions";
import { getSyncedOrder, listOrderEvents } from "@/lib/synced-orders.functions";

export const Route = createFileRoute("/orders/$id")({
  head: ({ params }) => ({
    meta: [{ title: metaT("meta.orderDetailTitle", { id: params.id }) }],
  }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const { id } = Route.useParams();
  const { workspaceId } = useWorkspaceId();
  const store = useStoreConnectionPreference();
  const messageRef = useRef<HTMLTextAreaElement | null>(null);
  const isPreview = id === ORDER_DETAIL_PREVIEW_ID;
  const orderId = Number(id);
  const validId = isPreview || (Number.isInteger(orderId) && orderId > 0);

  const orderQuery = useQuery({
    queryKey: ["order", orderId, workspaceId],
    enabled: !isPreview && Number.isInteger(orderId) && orderId > 0 && Boolean(workspaceId),
    queryFn: () => getSyncedOrder({ data: { orderId, workspaceId } }),
  });

  const previewOrder = isPreview ? getOrderDetailPreview() : null;
  const syncedOrder = orderQuery.data?.order ?? null;
  const order = previewOrder ?? syncedOrder;

  const eventsQuery = useQuery({
    queryKey: ["order-events", orderId, workspaceId],
    enabled:
      !isPreview &&
      Number.isInteger(orderId) &&
      orderId > 0 &&
      Boolean(syncedOrder) &&
      Boolean(workspaceId),
    queryFn: () => listOrderEvents({ data: { orderId, workspaceId } }),
  });

  const events = isPreview
    ? getOrderDetailPreviewEvents()
    : (eventsQuery.data?.events ?? []);

  const waitingWorkspace = !isPreview && Number.isInteger(orderId) && orderId > 0 && !workspaceId;
  const loadingOrder =
    !isPreview &&
    (waitingWorkspace || (Boolean(workspaceId) && orderQuery.isPending));

  const loadError =
    isPreview || !validId || waitingWorkspace
      ? null
      : (orderQuery.data?.error ??
        (orderQuery.isError ? t("orders.detail.loadError") : null));
  const notFound =
    !isPreview &&
    Number.isInteger(orderId) &&
    orderId > 0 &&
    Boolean(workspaceId) &&
    !orderQuery.isPending &&
    !loadError &&
    !order;

  const shopifyUrl = order
    ? isPreview
      ? "https://admin.shopify.com/store/erono/orders/13707091935609"
      : shopifyAdminOrderUrl(store.storeDomain, order.shopify_order_id)
    : null;
  const storeUrl = store.storeDomain
    ? `https://${store.storeDomain.replace(/^https?:\/\//, "")}`
    : isPreview
      ? "https://erono.myshopify.com"
      : null;
  const storeName = store.storeName ?? (isPreview ? "Erono Store" : null);
  const eventsError = isPreview ? null : (eventsQuery.data?.error ?? null);

  const confirmMutation = useMutation({
    mutationFn: () =>
      confirmOrderCodManual({
        data: {
          workspaceId: workspaceId!,
          orderUuid: order!.id,
        },
      }),
    onSuccess: (result) => {
      if (result.alreadyConfirmed) {
        toast.info(t("orders.detail.alreadyConfirmed"));
      } else if (result.applied) {
        toast.success(t("orders.detail.confirmOrderSuccess"));
      }
      void queryClient.invalidateQueries({ queryKey: ["order", orderId, workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["order-events", orderId, workspaceId] });
    },
    onError: () => {
      toast.error(t("orders.detail.confirmOrderFailed"));
    },
  });

  function focusMessage() {
    const el = document.getElementById("order-message-card");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      messageRef.current?.focus();
    }, 280);
  }

  return (
    <AppShell
      title={t("orders.title")}
      subtitle={isPreview ? t("orders.detail.previewBanner") : undefined}
    >
      {!validId ? (
        <NotFoundState />
      ) : loadingOrder ? (
        <div className="mx-auto w-full max-w-[1440px] space-y-3">
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
        <div className="mx-auto w-full max-w-[1440px] space-y-4">
          {isPreview ? (
            <p className="rounded-[10px] border border-[#E6E8EC] bg-[#EFF6FF] px-3 py-2 text-[12px] leading-snug text-[#1D4ED8] md:text-[13px]">
              {t("orders.detail.previewBanner")}
            </p>
          ) : null}

          <OrderDetailHeader
            order={order}
            shopifyUrl={shopifyUrl}
            onSendMessage={focusMessage}
            {...(!isPreview && workspaceId
              ? {
                  onConfirmOrder: () => confirmMutation.mutate(),
                  confirmingOrder: confirmMutation.isPending,
                }
              : {})}
          />

          {!isPreview && workspaceId ? (
            <CodConfirmationPanel order={order} workspaceId={workspaceId} />
          ) : null}

          {/* Progresso full → Cliente|Resumo → Produtos|Mensagem (mesma altura na 2ª linha) */}
          <div className="flex flex-col gap-4">
            <OrderProgress order={order} events={events} error={eventsError} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] xl:items-stretch">
              <div className="min-w-0 md:col-start-1 md:row-start-1">
                <CustomerDetailsCard order={order} />
              </div>
              <div className="min-w-0 md:col-start-2 md:row-start-1">
                <OrderSummaryCard
                  order={order}
                  storeName={storeName}
                  storeUrl={storeUrl}
                  softBottom
                />
              </div>
              <div className="hidden min-w-0 xl:col-start-1 xl:row-start-2 xl:flex">
                <OrderProductsCard order={order} className="flex-1" softBottom />
              </div>
              <div className="hidden min-w-0 xl:col-start-2 xl:row-start-2 xl:flex">
                <OrderMessageCard order={order} messageRef={messageRef} className="flex-1" />
              </div>
              <div className="min-w-0 md:col-span-2 xl:hidden">
                <OrderProductsCard order={order} softBottom />
              </div>
              <div className="min-w-0 md:col-span-2 xl:hidden">
                <OrderMessageCard order={order} messageRef={messageRef} />
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function NotFoundState() {
  const t = useT();
  return (
    <div className="rounded-[16px] border border-border bg-card px-6 py-14 text-center">
      <h2 className="text-[18px] font-semibold tracking-tight text-foreground">
        {t("orders.notFound")}
      </h2>
      <p className="mt-2 text-[13px] text-muted-foreground">{t("orders.detail.notFoundHint")}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button asChild className="h-9 rounded-[10px] text-[13px] shadow-none">
          <Link to="/orders/$id" params={{ id: ORDER_DETAIL_PREVIEW_ID }}>
            {t("orders.detail.viewPreview")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-9 rounded-[10px] text-[13px] shadow-none">
          <Link to="/orders">{t("orders.backToOrders")}</Link>
        </Button>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useT();
  return (
    <div className="rounded-[16px] border border-border bg-card px-6 py-14 text-center">
      <h2 className="text-[18px] font-semibold tracking-tight text-foreground">
        {t("orders.detail.loadError")}
      </h2>
      <p className="mt-2 text-[13px] text-muted-foreground">{message}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          onClick={onRetry}
          className="h-9 rounded-[10px] text-[13px] shadow-none"
        >
          {t("common.retry")}
        </Button>
        <Button asChild className="h-9 rounded-[10px] text-[13px] shadow-none">
          <Link to="/orders/$id" params={{ id: ORDER_DETAIL_PREVIEW_ID }}>
            {t("orders.detail.viewPreview")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-9 rounded-[10px] text-[13px] shadow-none">
          <Link to="/orders">{t("orders.backToOrders")}</Link>
        </Button>
      </div>
    </div>
  );
}

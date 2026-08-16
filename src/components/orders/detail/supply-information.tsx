import { AlertTriangle } from "lucide-react";

import {
  formatOrderId,
  formatOrderTotal,
  getOrderStatus,
  getOrderSupply,
  SUPPLY_LABEL,
  type OperationalOrder,
} from "@/lib/order-domain";

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className={`mt-1 text-[14px] text-foreground ${mono ? "font-mono text-[13px]" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

export function SupplyInformation({ order }: { order: OperationalOrder }) {
  const supply = getOrderSupply(order);
  const status = getOrderStatus(order);
  const showIncident = status.key === "incident" && Boolean(order.details?.trim());

  return (
    <section aria-labelledby="supply-heading" className="space-y-4">
      <h2 id="supply-heading" className="text-[15px] font-semibold text-foreground">
        Supply information
      </h2>

      {showIncident ? (
        <div
          role="status"
          className="flex gap-3 rounded-[12px] border border-red-100 bg-red-50/80 px-3.5 py-3"
        >
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-red-600"
            strokeWidth={1.5}
            aria-hidden
          />
          <div className="min-w-0 space-y-1">
            <p className="text-[13px] font-medium text-red-900">{status.label}</p>
            <p className="text-[13px] text-red-900/90">{order.details}</p>
          </div>
        </div>
      ) : null}

      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" value={order.status_name?.trim() || status.label} />
        {order.details?.trim() ? <Field label="Reason" value={order.details.trim()} /> : null}
        <Field label="Order ID" value={formatOrderId(order)} mono />
        {order.shopify_order_id != null ? (
          <Field label="Shopify order" value={`#${order.shopify_order_id}`} mono />
        ) : null}
        {order.shipping_company?.trim() ? (
          <Field label="Shipping company" value={order.shipping_company.trim()} />
        ) : null}
        {order.tracking_code?.trim() ? (
          <Field label="Tracking code" value={order.tracking_code.trim()} mono />
        ) : null}
        {order.tracking_url?.trim() ? (
          <Field label="Tracking URL" value={order.tracking_url.trim()} mono />
        ) : null}
        <Field label="Total" value={formatOrderTotal(order) ?? "—"} />
        {order.currency?.trim() ? (
          <Field label="Currency" value={order.currency.trim().toUpperCase()} />
        ) : null}
        <Field
          label="Supply"
          value={supply ? SUPPLY_LABEL[supply] : order.source}
        />
      </dl>
    </section>
  );
}

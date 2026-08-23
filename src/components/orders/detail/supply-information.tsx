import { AlertTriangle } from "lucide-react";

import { CarrierIdentity } from "@/components/carriers/carrier-identity";
import { useT } from "@/lib/i18n/locale-context";
import {
  formatOrderId,
  formatOrderTotal,
  getOrderStatus,
  getOrderSupply,
  ORDER_STATUS_I18N_KEY,
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

function translateDemoPrefixed(
  value: string,
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string,
) {
  const [head, ...tail] = value.split(" · ");
  if (head.startsWith("inbox.demo.")) {
    return [t(head), ...tail].join(" · ");
  }
  return value;
}

export function SupplyInformation({ order }: { order: OperationalOrder }) {
  const t = useT();
  const supply = getOrderSupply(order);
  const status = getOrderStatus(order);
  const rawStatus = order.status_name?.trim();
  const statusLabel = rawStatus
    ? rawStatus.startsWith("inbox.demo.")
      ? t(rawStatus)
      : rawStatus
    : t(ORDER_STATUS_I18N_KEY[status.key]);
  const detailsLabel = order.details?.trim()
    ? translateDemoPrefixed(order.details.trim(), t)
    : null;
  const showIncident = status.key === "incident" && Boolean(detailsLabel);

  return (
    <section aria-labelledby="supply-heading" className="space-y-4">
      <h2 id="supply-heading" className="text-[15px] font-semibold text-foreground">
        {t("orders.detail.supplyInfo")}
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
            <p className="text-[13px] font-medium text-red-900">{statusLabel}</p>
            <p className="text-[13px] text-red-900/90">{detailsLabel}</p>
          </div>
        </div>
      ) : null}

      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.status")} value={statusLabel} />
        {detailsLabel ? (
          <Field label={t("orders.detail.reason")} value={detailsLabel} />
        ) : null}
        <Field label={t("orders.detail.orderId")} value={formatOrderId(order)} mono />
        {order.shopify_order_id != null ? (
          <Field
            label={t("orders.detail.shopifyOrder")}
            value={`#${order.shopify_order_id}`}
            mono
          />
        ) : null}
        <div>
          <dt className="text-[12px] text-muted-foreground">{t("orders.detail.carrier")}</dt>
          <dd className="mt-1 text-[14px] text-foreground">
            <CarrierIdentity
              carrier={order.shipping_company}
              size="md"
              unavailableLabel={t("orders.detail.carrierUnavailable")}
              unknownLabel={t("carriers.noInfo")}
            />
          </dd>
        </div>
        {order.tracking_code?.trim() ? (
          <Field
            label={t("orders.detail.trackingCode")}
            value={order.tracking_code.trim()}
            mono
          />
        ) : null}
        {order.tracking_url?.trim() ? (
          <Field
            label={t("orders.detail.trackingUrl")}
            value={order.tracking_url.trim()}
            mono
          />
        ) : null}
        <Field label={t("orders.detail.total")} value={formatOrderTotal(order) ?? "—"} />
        {order.currency?.trim() ? (
          <Field
            label={t("orders.detail.currency")}
            value={order.currency.trim().toUpperCase()}
          />
        ) : null}
        <Field
          label={t("common.supply")}
          value={supply ? SUPPLY_LABEL[supply] : order.source}
        />
      </dl>
    </section>
  );
}

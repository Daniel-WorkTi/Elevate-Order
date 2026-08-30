import { ExternalLink } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { dropiOrderReferenceLabel, dropiOrdersPanelUrl } from "@/lib/integrations/dropi/dropi-order-url";
import { formatRelativeTimestamp } from "@/lib/format-relative-time";
import { useI18n, useT } from "@/lib/i18n/locale-context";
import {
  deriveCodOperationStatus,
  isDropiOrder,
  type CodOperationStatus,
} from "@/lib/orders/cod-operation";
import { markCodOperationHandled } from "@/lib/orders/cod-operation.functions";
import type { OperationalOrder } from "@/lib/order-domain";
import { cn } from "@/lib/utils";

const OPERATION_LABEL: Record<Exclude<CodOperationStatus, "not_applicable">, string> = {
  pending_action: "orders.codOperation.pendingAction",
  handled: "orders.codOperation.handled",
  externally_confirmed: "orders.codOperation.externallyConfirmed",
};

function operationTone(status: CodOperationStatus): string {
  if (status === "pending_action") return "text-amber-700";
  if (status === "handled") return "text-[#2563EB]";
  if (status === "externally_confirmed") return "text-emerald-700";
  return "text-[#667085]";
}

export function CodConfirmationPanel({
  order,
  workspaceId,
  handledByLabel,
  className,
}: {
  order: OperationalOrder;
  workspaceId: string;
  handledByLabel?: string | null;
  className?: string;
}) {
  if (!isDropiOrder(order) || order.cod_reply_intent !== "confirm") {
    return null;
  }

  return (
    <CodConfirmationPanelBody
      order={order}
      workspaceId={workspaceId}
      {...(handledByLabel != null ? { handledByLabel } : {})}
      {...(className ? { className } : {})}
    />
  );
}

function CodConfirmationPanelBody({
  order,
  workspaceId,
  handledByLabel,
  className,
}: {
  order: OperationalOrder;
  workspaceId: string;
  handledByLabel?: string | null;
  className?: string;
}) {
  const t = useT();
  const { locale } = useI18n();
  const queryClient = useQueryClient();

  const operationStatus = deriveCodOperationStatus(order);
  const dropiUrl = dropiOrdersPanelUrl();
  const dropiRef = dropiOrderReferenceLabel(order.order_id);

  const handleMutation = useMutation({
    mutationFn: () =>
      markCodOperationHandled({
        data: { workspaceId, orderUuid: order.id },
      }),
    onSuccess: (result) => {
      if (result.alreadyHandled) {
        toast.info(t("orders.codOperation.alreadyHandled"));
      } else if (result.applied) {
        toast.success(t("orders.codOperation.markHandledSuccess"));
      }
      void queryClient.invalidateQueries({ queryKey: ["order", order.order_id, workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: () => {
      toast.error(t("orders.codOperation.markHandledFailed"));
    },
  });

  function openDropi() {
    window.open(dropiUrl, "_blank", "noopener,noreferrer");
  }

  const operationLabelKey =
    operationStatus !== "not_applicable" ? OPERATION_LABEL[operationStatus] : null;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[14px] border border-[#E6E8EC] bg-white p-4",
        className,
      )}
    >
      <h3 className="text-[13px] font-semibold tracking-tight text-[#0A0C10]">
        {t("orders.codOperation.title")}
      </h3>

      <dl className="mt-3 space-y-3 text-[13px]">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-[#98A2B3]">
            {t("orders.codOperation.customer")}
          </dt>
          <dd className="mt-0.5 text-[#0A0C10]">{t("orders.codOperation.customerConfirmed")}</dd>
          {order.cod_reply_text?.trim() ? (
            <dd className="mt-1 text-[12px] text-[#667085]">
              {t("orders.codOperation.reply")}: &quot;{order.cod_reply_text.trim()}&quot;
            </dd>
          ) : null}
          {order.cod_reply_at ? (
            <dd className="mt-1 text-[12px] text-[#667085]">
              {t("orders.codOperation.received")}:{" "}
              {formatRelativeTimestamp(order.cod_reply_at, { locale })?.relative ?? order.cod_reply_at}
            </dd>
          ) : null}
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-[#98A2B3]">
            {t("orders.codOperation.dropiOperation")}
          </dt>
          <dd className={cn("mt-0.5 font-medium", operationTone(operationStatus))}>
            {operationLabelKey ? t(operationLabelKey) : "—"}
          </dd>
          {operationStatus === "handled" && order.cod_handled_at ? (
            <dd className="mt-1 text-[12px] text-[#667085]">
              {handledByLabel
                ? t("orders.codOperation.handledBy", { name: handledByLabel })
                : t("orders.codOperation.handledGeneric")}{" "}
              · {formatRelativeTimestamp(order.cod_handled_at, { locale })?.relative ?? order.cod_handled_at}
            </dd>
          ) : null}
          {operationStatus === "pending_action" ? (
            <dd className="mt-1 text-[12px] text-[#667085]">
              {t("orders.codOperation.dropiRefHint", { id: dropiRef })}
            </dd>
          ) : null}
        </div>
      </dl>

      {operationStatus === "pending_action" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-[10px] text-[13px] shadow-none"
            onClick={openDropi}
          >
            <ExternalLink className="mr-1.5 size-3.5" strokeWidth={1.5} />
            {t("orders.codOperation.openDropi")}
          </Button>
          <Button
            type="button"
            className="h-9 rounded-[10px] bg-[#2563EB] text-[13px] text-white shadow-none hover:bg-[#1D4ED8]"
            disabled={handleMutation.isPending}
            onClick={() => handleMutation.mutate()}
          >
            {t("orders.codOperation.markHandled")}
          </Button>
        </div>
      ) : operationStatus === "handled" ? (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-[10px] text-[13px] shadow-none"
            onClick={openDropi}
          >
            <ExternalLink className="mr-1.5 size-3.5" strokeWidth={1.5} />
            {t("orders.codOperation.openDropi")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function CodDropiOperationHint({
  order,
  className,
}: {
  order: OperationalOrder;
  className?: string;
}) {
  const t = useT();

  if (!isDropiOrder(order) || order.cod_reply_intent !== "confirm") {
    return null;
  }

  const status = deriveCodOperationStatus(order);
  if (status === "not_applicable") return null;

  const suffixKey =
    status === "pending_action"
      ? "orders.codReply.badgeYesPendingDropi"
      : status === "handled"
        ? "orders.codReply.badgeYesHandled"
        : "orders.codReply.badgeYesExternal";

  return (
    <p className={cn("text-[11px] text-[#667085]", className)}>{t(suffixKey)}</p>
  );
}

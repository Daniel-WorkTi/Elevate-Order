import { cn } from "@/lib/utils";
import { getOrderStatus, type OperationalOrder } from "@/lib/order-domain";

const STATUS_CLASS: Record<ReturnType<typeof getOrderStatus>["key"], string> = {
  incident: "bg-red-50 text-red-800",
  waiting: "bg-amber-50 text-amber-800",
  messaged: "bg-[color:var(--elevate-blue-soft)] text-[color:var(--elevate-blue)]",
  shipped: "bg-slate-100 text-slate-700",
  delivered: "bg-emerald-50 text-emerald-800",
  confirmed: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-slate-100 text-slate-600",
  unknown: "bg-slate-100 text-slate-700",
};

export function OrderStatusBadge({
  order,
  className,
}: {
  order: Pick<OperationalOrder, "status_name" | "details">;
  className?: string;
}) {
  const status = getOrderStatus(order);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-[12px] font-medium",
        STATUS_CLASS[status.key],
        className,
      )}
    >
      {status.label}
    </span>
  );
}

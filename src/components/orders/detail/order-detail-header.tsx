import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { SupplyName } from "@/components/supply-logo";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { formatOrderId, getOrderSupply, type OperationalOrder } from "@/lib/order-domain";

export function OrderDetailHeader({ order }: { order: OperationalOrder }) {
  const supply = getOrderSupply(order);

  return (
    <header className="space-y-3">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)] focus-visible:ring-offset-2"
      >
        <ChevronLeft className="size-3.5" strokeWidth={1.5} aria-hidden />
        Orders
      </Link>

      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-[22px] font-semibold tracking-tight text-[color:var(--elevate-text)]">
          {formatOrderId(order)}
        </h1>
        {supply ? (
          <SupplyName
            supply={supply}
            className="rounded-full border border-[#E6E8EC] bg-white px-2 py-0.5 text-[12px] font-medium text-[#0A0C10]"
          />
        ) : (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-medium text-slate-700">
            {order.source}
          </span>
        )}
        <OrderStatusBadge order={order} />
      </div>
    </header>
  );
}

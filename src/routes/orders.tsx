import { Outlet, createFileRoute } from "@tanstack/react-router";

import { ordersSearchSchema } from "@/lib/orders-search";

export const Route = createFileRoute("/orders")({
  validateSearch: ordersSearchSchema,
  component: OrdersLayout,
});

function OrdersLayout() {
  return <Outlet />;
}

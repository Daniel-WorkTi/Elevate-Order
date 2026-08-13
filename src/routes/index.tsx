import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { OrdersBoard } from "@/components/orders-board";
import { orders } from "@/lib/orders";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inbox — ELEVATE" },
      {
        name: "description",
        content: "Operational inbox for orders that need WhatsApp attention.",
      },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const inboxCount = orders.filter(
    (o) => o.status === "incident" || o.status === "unanswered",
  ).length;

  return (
    <AppShell
      title="Inbox"
      subtitle="Orders that need your attention"
      inboxCount={inboxCount}
    >
      <OrdersBoard />
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { InboxPageContent } from "@/components/inbox/inbox-page";
import { inboxItemsForSupply } from "@/lib/inbox/inbox-demo";

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
  const inboxCount =
    inboxItemsForSupply("dropi").length + inboxItemsForSupply("dropea").length;

  return (
    <AppShell
      title="Inbox"
      subtitle="Orders that need your attention"
      inboxCount={inboxCount}
    >
      <InboxPageContent />
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { InboxPageContent } from "@/components/inbox/inbox-page";
import { metaT } from "@/lib/i18n/meta";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: metaT("meta.inboxTitle") },
      { name: "description", content: metaT("meta.inboxDescription") },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const t = useT();

  return (
    <AppShell title={t("inbox.title")} subtitle={t("inbox.subtitle")}>
      <InboxPageContent />
    </AppShell>
  );
}

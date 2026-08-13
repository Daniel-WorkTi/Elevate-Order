import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [{ title: "Templates — ELEVATE" }],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  return (
    <AppShell title="Templates" subtitle="Message layouts by incident reason">
      <div className="rounded-[16px] border border-border bg-card p-8">
        <p className="text-[14px] text-muted-foreground">
          Template editor will live here — fixed layout with tracking placeholders.
        </p>
      </div>
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/profits")({
  head: () => ({
    meta: [{ title: "Profits — ELEVATE" }],
  }),
  component: ProfitsPage,
});

function ProfitsPage() {
  return (
    <AppShell title="Profits" subtitle="Filter by supply, date and currency">
      <div className="rounded-[16px] border border-border bg-card p-8">
        <p className="text-[14px] text-muted-foreground">
          Profits table (TanStack) with Dropi + Dropea filters will live here.
        </p>
      </div>
    </AppShell>
  );
}

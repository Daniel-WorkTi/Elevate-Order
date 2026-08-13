import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";

const connectionsSearchSchema = z.object({
  source: z.enum(["shopify", "dropi", "dropea"]).optional(),
});

export const Route = createFileRoute("/connections")({
  validateSearch: connectionsSearchSchema,
  head: () => ({
    meta: [{ title: "Connections — ELEVATE" }],
  }),
  component: ConnectionsPage,
});

const sourceLabels = {
  shopify: "Shopify",
  dropi: "Dropi Pro",
  dropea: "Dropea",
} as const;

function ConnectionsPage() {
  const { source } = Route.useSearch();
  const focusLabel = source ? sourceLabels[source] : null;

  return (
    <AppShell title="Connections" subtitle="Dropi webhook and Dropea API">
      <div className="rounded-[16px] border border-border bg-card p-8">
        <p className="text-[14px] text-muted-foreground">
          Supply credentials and webhook URL configuration will live here.
        </p>
        {focusLabel ? (
          <p className="mt-4 rounded-[10px] border border-border bg-muted px-3 py-2 text-[13px] text-foreground">
            Setup for <span className="font-medium">{focusLabel}</span> is not completed yet.
            Credentials and OAuth flows will be added here — no connection was made.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

const AnalyticsCharts = lazy(() => import("@/components/analytics-charts"));

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — ELEVATE" },
      {
        name: "description",
        content:
          "Message success rates, response times and incident resolution trends for your WhatsApp automations.",
      },
      { property: "og:title", content: "Analytics — ELEVATE" },
      {
        property: "og:description",
        content: "Track delivery rates, reply rates and average response time week over week.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const kpis = [
  { label: "Delivery rate", value: "98.2%", hint: "+1.4% vs last week" },
  { label: "Reply rate", value: "71.6%", hint: "+3.1% vs last week" },
  { label: "Avg. response", value: "18 min", hint: "-4 min vs last week" },
  { label: "Incidents solved", value: "86%", hint: "+6% vs last week" },
];

function ChartsFallback() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
        >
          <Skeleton className="h-5 w-56" />
          <Skeleton className="mt-4 h-72 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function AnalyticsPage() {
  return (
    <AppShell title="Analytics" subtitle="How your automated conversations are performing.">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="card-lift rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="mt-2 text-[32px] font-bold leading-none">{kpi.value}</p>
              <p className="mt-2 text-xs text-success">{kpi.hint}</p>
            </div>
          ))}
        </div>

        <ClientOnly fallback={<ChartsFallback />}>
          <Suspense fallback={<ChartsFallback />}>
            <AnalyticsCharts />
          </Suspense>
        </ClientOnly>
      </div>
    </AppShell>
  );
}

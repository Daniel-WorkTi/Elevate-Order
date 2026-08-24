import { useState } from "react";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatOrderStamp } from "@/lib/i18n/date-locale";
import { useI18n } from "@/lib/i18n/locale-context";
import type { OperationalOrder } from "@/lib/order-domain";
import {
  buildOrderProgress,
  sortEventsNewestFirst,
  type OrderProgressStep,
  type ProgressStepState,
} from "@/lib/orders/order-progress";
import type { OrderEventRow } from "@/lib/synced-orders.functions";
import { cn } from "@/lib/utils";

function eventTitle(
  event: OrderEventRow,
  t: (key: string) => string,
): string {
  const name = event.status_name?.trim();
  if (name) return name;
  if (event.details?.trim()) return t("orders.detail.statusUpdated");
  return t("orders.detail.orderEvent");
}

function dotClass(state: ProgressStepState): string {
  switch (state) {
    case "done":
      return "border-emerald-500 bg-emerald-500";
    case "current":
      return "border-[color:var(--elevate-blue)] bg-[color:var(--elevate-blue)] ring-4 ring-[color:var(--elevate-blue-soft)]";
    case "problem":
      return "border-red-500 bg-red-500 ring-4 ring-red-50";
    default:
      return "border-[#D0D5DD] bg-white";
  }
}

function labelClass(state: ProgressStepState): string {
  switch (state) {
    case "done":
      return "text-[#0A0C10]";
    case "current":
      return "text-[color:var(--elevate-blue)]";
    case "problem":
      return "text-red-700";
    default:
      return "text-muted-foreground";
  }
}

function connectorClass(state: ProgressStepState, nextState?: ProgressStepState): string {
  if (state === "done") return "bg-emerald-400";
  if (state === "current" || state === "problem") {
    // Partial progress toward the next step (matches mock: blue segment after current)
    if (nextState === "upcoming") return "bg-[color:var(--elevate-blue)]";
    return "bg-[color:var(--elevate-blue)]";
  }
  return "bg-[#E6E8EC]";
}

function StepStamp({
  step,
  locale,
  t,
}: {
  step: OrderProgressStep;
  locale: "pt" | "en";
  t: (key: string) => string;
}) {
  if (step.state === "current" || step.state === "problem") {
    return <span className="text-[11px] text-[#667085]">{t("orders.detail.progress.current")}</span>;
  }
  if (step.state === "upcoming" || !step.at) {
    return <span className="text-[11px] text-[#98A2B3]">—</span>;
  }
  return (
    <time dateTime={step.at} className="text-[11px] text-[#667085]">
      {formatOrderStamp(step.at, locale)}
    </time>
  );
}

function HorizontalProgress({
  steps,
  locale,
  t,
}: {
  steps: OrderProgressStep[];
  locale: "pt" | "en";
  t: (key: string) => string;
}) {
  return (
    <ol className="flex w-full items-start gap-0 px-1">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const next = steps[index + 1];
        return (
          <li key={step.id} className="relative flex min-w-0 flex-1 flex-col items-center">
            {!isLast ? (
              <span
                className={cn(
                  "absolute left-[calc(50%+8px)] right-[calc(-50%+8px)] top-[6px] h-[2px]",
                  connectorClass(step.state, next?.state),
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn("relative z-[1] size-3 rounded-full border-2", dotClass(step.state))}
              aria-hidden
            />
            <p
              className={cn(
                "mt-2.5 max-w-[120px] text-center text-[12px] font-medium leading-snug xl:max-w-none xl:text-[13px]",
                labelClass(step.state),
              )}
            >
              {step.label}
            </p>
            <div className="mt-1">
              <StepStamp step={step} locale={locale} t={t} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function VerticalProgress({
  steps,
  locale,
  t,
}: {
  steps: OrderProgressStep[];
  locale: "pt" | "en";
  t: (key: string) => string;
}) {
  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-3 pb-3 last:pb-0">
            <div className="relative flex w-3.5 shrink-0 flex-col items-center">
              <span className={cn("relative z-[1] size-3.5 rounded-full border-2", dotClass(step.state))} />
              {!isLast ? (
                <span
                  className={cn("mt-1 w-0.5 flex-1 min-h-[18px]", connectorClass(step.state))}
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pt-0">
              <div className="flex items-start justify-between gap-3">
                <p className={cn("text-[13px] font-medium", labelClass(step.state))}>{step.label}</p>
                <StepStamp step={step} locale={locale} t={t} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function FullHistoryList({
  events,
  locale,
  t,
}: {
  events: OrderEventRow[];
  locale: "pt" | "en";
  t: (key: string) => string;
}) {
  const sorted = sortEventsNewestFirst(events);
  if (sorted.length === 0) {
    return <p className="text-[13px] text-muted-foreground">{t("orders.detail.noTimeline")}</p>;
  }

  return (
    <ol className="space-y-0">
      {sorted.map((event) => (
        <li
          key={event.id}
          className="flex items-start justify-between gap-3 border-b border-[#E6E8EC] py-3 last:border-b-0"
        >
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[#0A0C10]">{eventTitle(event, t)}</p>
            {event.details?.trim() && event.details.trim() !== event.status_name?.trim() ? (
              <p className="mt-0.5 text-[12px] text-muted-foreground">{event.details.trim()}</p>
            ) : null}
          </div>
          <time dateTime={event.event_date} className="shrink-0 text-[12px] text-muted-foreground">
            {formatOrderStamp(event.event_date, locale)}
          </time>
        </li>
      ))}
    </ol>
  );
}

export function OrderProgress({
  order,
  events,
  error,
}: {
  order: OperationalOrder;
  events: OrderEventRow[];
  error: string | null;
}) {
  const { t, locale } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const steps = buildOrderProgress(events, order, t);
  const showFullHistoryCta = events.length > 0;

  return (
    <>
      <section
        aria-labelledby="progress-heading"
        className="rounded-[12px] border border-[#E6E8EC] bg-white p-5 shadow-none"
      >
        <div className="mb-3 flex items-center justify-between gap-3 lg:mb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            <h2
              id="progress-heading"
              className="text-[14px] font-semibold text-foreground md:text-[15px]"
            >
              {t("orders.detail.progress.title")}
            </h2>
          </div>
          {showFullHistoryCta ? (
            <Button
              type="button"
              variant="ghost"
              className="h-8 shrink-0 px-2 text-[12px] text-[color:var(--elevate-blue)] hover:bg-transparent hover:text-[color:var(--elevate-blue-hover)] md:text-[13px]"
              onClick={() => setDrawerOpen(true)}
            >
              {t("orders.detail.viewFullHistory")}
            </Button>
          ) : null}
        </div>

        {error ? <p className="text-[13px] text-muted-foreground">{error}</p> : null}

        {!error ? (
          <>
            <div className="hidden lg:block">
              <HorizontalProgress steps={steps} locale={locale} t={t} />
            </div>
            <div className="lg:hidden">
              <VerticalProgress steps={steps} locale={locale} t={t} />
            </div>
          </>
        ) : null}
      </section>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full max-w-md border-l border-[#E6E8EC] p-0 sm:max-w-md">
          <SheetHeader className="border-b border-[#E6E8EC] px-5 py-4 text-left">
            <SheetTitle className="text-[15px] font-semibold">
              {t("orders.detail.history")}
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-5 py-2">
            <FullHistoryList events={events} locale={locale} t={t} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

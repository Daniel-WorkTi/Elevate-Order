import { format } from "date-fns";
import { Clock } from "lucide-react";

import type { OrderEventRow } from "@/lib/synced-orders.functions";
import { cn } from "@/lib/utils";

function eventTitle(event: OrderEventRow): string {
  const name = event.status_name?.trim();
  if (name) return name;
  if (event.details?.trim()) return "Status updated";
  return "Order event";
}

function nodeTone(statusName: string | null): string {
  const s = (statusName ?? "").toLowerCase();
  if (/incident|fail|error|refus|return|cancel/.test(s)) return "bg-red-500";
  if (/deliver|resolv|confirm|success/.test(s)) return "bg-emerald-500";
  if (/ship|transit|track/.test(s)) return "bg-[color:var(--elevate-blue)]";
  return "bg-slate-400";
}

export function OrderTimeline({
  events,
  error,
}: {
  events: OrderEventRow[];
  error: string | null;
}) {
  return (
    <section aria-labelledby="timeline-heading" className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        <h2 id="timeline-heading" className="text-[15px] font-semibold text-foreground">
          Timeline
        </h2>
      </div>

      {error ? <p className="text-[13px] text-muted-foreground">{error}</p> : null}

      {!error && events.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No timeline events recorded yet.</p>
      ) : null}

      {events.length > 0 ? (
        <ol className="relative space-y-0 border-l border-border pl-4">
          {events.map((event) => {
            const at = new Date(event.event_date);
            const stamp = Number.isNaN(at.getTime())
              ? event.event_date
              : format(at, "d MMM yyyy · HH:mm");
            return (
              <li key={event.id} className="relative pb-5 last:pb-0">
                <span
                  className={cn(
                    "absolute -left-[21px] top-1.5 size-2.5 rounded-full ring-4 ring-white",
                    nodeTone(event.status_name),
                  )}
                  aria-hidden
                />
                <p className="text-[14px] font-medium text-foreground">{eventTitle(event)}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {event.source}
                  <span className="mx-1.5 text-border">·</span>
                  <time dateTime={event.event_date}>{stamp}</time>
                </p>
                {event.details?.trim() ? (
                  <p className="mt-1 text-[13px] text-muted-foreground">{event.details.trim()}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}

import { Link } from "@tanstack/react-router";
import { AlertTriangle, Clock, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatInboxMoney,
  formatInboxTime,
  inboxPriorityAccent,
} from "@/lib/inbox/inbox-format";
import type { InboxItem } from "@/lib/inbox/inbox-types";
import { suggestedMessage, whatsappLink } from "@/lib/orders";
import { cn } from "@/lib/utils";

function PriorityIcon({ priority }: { priority: InboxItem["priority"] }) {
  if (priority === "critical") return <AlertTriangle className="size-3.5" strokeWidth={1.75} />;
  if (priority === "waiting") return <Clock className="size-3.5" strokeWidth={1.75} />;
  return <MessageCircle className="size-3.5" strokeWidth={1.75} />;
}

export function InboxQueueRow({ item }: { item: InboxItem }) {
  const accent = inboxPriorityAccent(item.priority);
  const waHref = whatsappLink(
    {
      id: item.id,
      customer: item.customer,
      phone: item.phone,
      postalCode: "",
      city: item.country,
      status: item.priority === "critical" ? "incident" : "unanswered",
      date: item.updatedAt,
      total: item.total,
      product: item.product,
      source: item.supply === "dropi" ? "Dropi Pro" : "Dropea",
      lastSync: formatInboxTime(item.updatedAt),
      reason: item.issueLabel,
      note: item.issueDetail,
    },
    suggestedMessage({
      id: item.id,
      customer: item.customer,
      phone: item.phone,
      postalCode: "",
      city: item.country,
      status: item.priority === "critical" ? "incident" : "unanswered",
      date: item.updatedAt,
      total: item.total,
      product: item.product,
      source: item.supply === "dropi" ? "Dropi Pro" : "Dropea",
      lastSync: formatInboxTime(item.updatedAt),
      reason: item.issueLabel,
      note: item.issueDetail,
    }),
  );

  return (
    <article className="relative flex flex-col gap-4 border-b border-[#E6E8EC] py-4 last:border-b-0 md:flex-row md:items-center md:gap-5 md:py-3.5">
      <span
        className={cn("absolute inset-y-3 left-0 w-[3px] rounded-full", accent.bar)}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 items-start gap-3 pl-3 md:items-center">
        <span
          className={cn(
            "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full md:mt-0",
            accent.icon,
          )}
          aria-hidden
        >
          <PriorityIcon priority={item.priority} />
        </span>

        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-center lg:gap-4">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[#0A0C10]">#{item.id}</p>
            <p className="mt-0.5 text-[12px] text-[#667085]">{formatInboxTime(item.updatedAt)}</p>
          </div>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[#0A0C10]">{item.customer}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#667085]">
              <img
                src={`https://flagcdn.com/w40/${item.countryCode}.png`}
                alt=""
                width={16}
                height={12}
                className="h-3 w-4 rounded-[2px] object-cover"
                loading="lazy"
              />
              {item.country}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-[13px] font-semibold tabular-nums text-[#0A0C10]">
              {formatInboxMoney(item)}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-[#667085]">{item.product}</p>
          </div>

          <div className="min-w-0">
            <p className={cn("text-[13px] font-semibold", accent.label)}>{item.issueLabel}</p>
            <p className={cn("mt-0.5 truncate text-[12px]", accent.detail)}>{item.issueDetail}</p>
          </div>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-[#0A0C10]">
              {item.carrier ?? "—"}
            </p>
            <p className="mt-0.5 truncate text-[12px] tabular-nums text-[#667085]">
              {item.tracking ?? "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 pl-3 sm:flex-row md:w-[148px] md:flex-col md:pl-0">
        <Button
          asChild
          variant="outline"
          className="h-9 rounded-[10px] border-[#2563EB]/35 bg-white px-3 text-[12px] font-medium text-[#2563EB] shadow-none hover:bg-[#EFF6FF]"
        >
          <a href={waHref} target="_blank" rel="noreferrer">
            <WhatsAppGlyph className="size-3.5 text-[#16A34A]" />
            Contact customer
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-9 rounded-[10px] border-[#E6E8EC] bg-white px-3 text-[12px] font-medium text-[#0A0C10] shadow-none hover:bg-[#F7F8FA]"
        >
          <Link to="/orders/$id" params={{ id: String(Number(item.id.replace(/\D/g, "")) || item.id) }}>
            View order
          </Link>
        </Button>
      </div>
    </article>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.96L0 24l6.3-1.65a11.86 11.86 0 0 0 5.76 1.47h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.44ZM12.07 21.15h-.01a9.3 9.3 0 0 1-4.74-1.3l-.34-.2-3.74.98 1-3.64-.22-.37a9.27 9.27 0 0 1-1.42-4.95c0-5.13 4.18-9.3 9.32-9.3a9.26 9.26 0 0 1 9.3 9.3c0 5.13-4.18 9.3-9.15 9.3Zm5.1-6.96c-.28-.14-1.65-.81-1.9-.9-.26-.1-.44-.14-.63.14-.18.27-.72.9-.88 1.08-.16.18-.33.2-.6.07-.28-.14-1.17-.43-2.23-1.37-.82-.73-1.38-1.64-1.54-1.91-.16-.27-.02-.42.12-.55.13-.13.28-.33.42-.5.14-.16.18-.28.28-.46.09-.19.05-.35-.02-.49-.07-.14-.63-1.51-.86-2.07-.23-.55-.46-.47-.63-.48h-.54c-.18 0-.48.07-.73.35-.26.27-.96.94-.96 2.3s.99 2.67 1.13 2.85c.14.18 1.94 2.96 4.7 4.15.66.28 1.17.45 1.57.58.66.21 1.26.18 1.73.11.53-.08 1.65-.67 1.88-1.32.23-.65.23-1.2.16-1.32-.07-.11-.25-.18-.53-.32Z" />
    </svg>
  );
}

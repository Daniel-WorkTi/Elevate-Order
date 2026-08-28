import { Link } from "@tanstack/react-router";
import { AlertTriangle, Clock, MessageCircle } from "lucide-react";

import { CarrierIdentity } from "@/components/carriers/carrier-identity";
import { Button } from "@/components/ui/button";
import { useCurrencyPreference } from "@/hooks/use-currency-preference";
import { useEurRateTable } from "@/hooks/use-eur-rate-table";
import { formatInboxMoney, formatInboxTime, inboxPriorityAccent } from "@/lib/inbox/inbox-format";
import type { InboxItem } from "@/lib/inbox/inbox-types";
import { useI18n } from "@/lib/i18n/locale-context";
import { suggestedMessage, whatsappLink } from "@/lib/orders";
import { cn } from "@/lib/utils";

function CountryFlag({ code, label }: { code: string; label: string }) {
  const iso = code.trim().toLowerCase();
  const hasFlag = iso.length === 2 && iso !== "un";
  if (!hasFlag) {
    return label ? <span className="truncate">{label}</span> : null;
  }
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={label || iso.toUpperCase()}
      title={label || iso.toUpperCase()}
      width={16}
      height={12}
      className="h-3 w-4 shrink-0 rounded-[2px] object-cover"
      loading="lazy"
    />
  );
}

function PriorityIcon({ priority }: { priority: InboxItem["priority"] }) {
  if (priority === "critical") return <AlertTriangle className="size-3.5" strokeWidth={1.75} />;
  if (priority === "waiting") return <Clock className="size-3.5" strokeWidth={1.75} />;
  return <MessageCircle className="size-3.5" strokeWidth={1.75} />;
}

function demoLabel(
  value: string,
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string,
) {
  return value.startsWith("inbox.demo.") ? t(value) : value;
}

export function InboxQueueRow({ item }: { item: InboxItem }) {
  const { locale, t } = useI18n();
  const { displayCurrency } = useCurrencyPreference();
  const fx = useEurRateTable();
  const money = formatInboxMoney(item, {
    displayCurrency,
    rateMap: fx.rateMap,
  });
  const accent = inboxPriorityAccent(item.priority);
  const issueLabel = demoLabel(item.issueLabel, t);
  const issueDetail = demoLabel(item.issueDetail, t);
  const lastSync = formatInboxTime(item.updatedAt, locale);
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
      lastSync,
      reason: issueLabel,
      note: issueDetail,
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
      lastSync,
      reason: issueLabel,
      note: issueDetail,
    }),
  );

  return (
    <article className="rounded-[14px] border border-[#E6E8EC] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      {/* Mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-[10px]",
              accent.icon,
            )}
            aria-hidden
          >
            <PriorityIcon priority={item.priority} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#0A0C10]">#{item.id}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[#667085]">
              <Clock className="size-3 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="truncate">{lastSync}</span>
            </p>
          </div>
          <p className="shrink-0 text-[13px] font-semibold tabular-nums text-[#0A0C10]">{money}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[#0A0C10]">{item.customer}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#667085]">
              <CountryFlag code={item.countryCode} label={item.country} />
            </p>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] text-[#667085]">{item.product}</p>
            <CarrierIdentity
              carrier={item.carrier}
              size="sm"
              unknownLabel={t("carriers.noInfo")}
              className="mt-1 h-5 text-[13px] font-medium text-[#0A0C10]"
            />
          </div>
        </div>

        <div className="min-w-0 rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2">
          <p className={cn("flex items-center gap-1.5 text-[13px] font-semibold", accent.label)}>
            <span className={cn("size-1.5 shrink-0 rounded-full", accent.dot)} aria-hidden />
            <span className="truncate">{issueLabel}</span>
          </p>
          <p className={cn("mt-0.5 truncate text-[12px]", accent.detail)}>{issueDetail}</p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            asChild
            className="h-10 rounded-[10px] bg-[#2563EB] px-3 text-[12px] font-medium text-white shadow-none hover:bg-[#1D4ED8]"
          >
            <a href={waHref} target="_blank" rel="noreferrer">
              <WhatsAppGlyph className="size-3.5 text-white" />
              {t("inbox.contactCustomer")}
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-[10px] border-[#E6E8EC] bg-white px-3 text-[12px] font-medium text-[#0A0C10] shadow-none hover:bg-[#F7F8FA]"
          >
            <Link
              to="/orders/$id"
              params={{ id: String(Number(item.id.replace(/\D/g, "")) || item.id) }}
            >
              {t("inbox.viewOrder")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Desktop */}
      <div
        className={cn(
          "hidden md:grid md:grid-cols-[36px_12px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1.15fr)_minmax(0,0.95fr)_148px]",
          "md:items-center md:gap-x-4",
        )}
      >
        <span
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-[10px]",
            accent.icon,
          )}
          aria-hidden
        >
          <PriorityIcon priority={item.priority} />
        </span>

        <div className="h-9 w-px justify-self-center bg-[#E6E8EC]" aria-hidden />

        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-5 text-[#0A0C10]">#{item.id}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] leading-4 text-[#667085]">
            <Clock className="size-3 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="truncate">{lastSync}</span>
          </p>
        </div>

        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-5 text-[#0A0C10]">
            {item.customer}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] leading-4 text-[#667085]">
            <CountryFlag code={item.countryCode} label={item.country} />
          </p>
        </div>

        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-5 tabular-nums text-[#0A0C10]">
            {money}
          </p>
          <p className="mt-0.5 truncate text-[12px] leading-4 text-[#667085]">{item.product}</p>
        </div>

        <div className="min-w-0">
          <p
            className={cn(
              "flex min-w-0 items-center gap-1.5 text-[13px] font-semibold leading-5",
              accent.label,
            )}
          >
            <span className={cn("size-1.5 shrink-0 rounded-full", accent.dot)} aria-hidden />
            <span className="truncate">{issueLabel}</span>
          </p>
          <p className={cn("mt-0.5 truncate text-[12px] leading-4", accent.detail)}>
            {issueDetail}
          </p>
        </div>

        <div className="min-w-0">
          <CarrierIdentity
            carrier={item.carrier}
            size="sm"
            unknownLabel={t("carriers.noInfo")}
            className="h-5 text-[13px] font-medium leading-5 text-[#0A0C10]"
          />
          <p className="mt-0.5 truncate text-[12px] leading-4 tabular-nums text-[#667085]">
            {item.tracking ?? "—"}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            asChild
            className="h-9 w-full rounded-[10px] bg-[#2563EB] px-3 text-[12px] font-medium text-white shadow-none hover:bg-[#1D4ED8]"
          >
            <a href={waHref} target="_blank" rel="noreferrer">
              <WhatsAppGlyph className="size-3.5 text-white" />
              {t("inbox.contactCustomer")}
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-9 w-full rounded-[10px] border-[#E6E8EC] bg-white px-3 text-[12px] font-medium text-[#0A0C10] shadow-none hover:bg-[#F7F8FA]"
          >
            <Link
              to="/orders/$id"
              params={{ id: String(Number(item.id.replace(/\D/g, "")) || item.id) }}
            >
              {t("inbox.viewOrder")}
            </Link>
          </Button>
        </div>
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

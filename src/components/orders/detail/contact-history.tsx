import { formatDateTime } from "@/lib/i18n/date-locale";
import { useI18n } from "@/lib/i18n/locale-context";
import type { OrderEventRow } from "@/lib/synced-orders.functions";

const CONTACT_PATTERN = /messag|whatsapp|contact|contacted|mensagem|contacto|contato/i;

export function isContactHistoryEvent(event: Pick<OrderEventRow, "status_name" | "details">) {
  return CONTACT_PATTERN.test(`${event.status_name ?? ""} ${event.details ?? ""}`);
}

export function ContactHistory({ events = [] }: { events?: OrderEventRow[] }) {
  const { t, locale } = useI18n();
  const contacts = events.filter(isContactHistoryEvent);

  return (
    <div className="space-y-2">
      <h3 className="text-[13px] font-semibold text-foreground">
        {t("orders.detail.contactHistory")}
      </h3>
      {contacts.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{t("orders.detail.noContactActivity")}</p>
      ) : (
        <ol className="space-y-3">
          {contacts.map((event) => {
            const at = new Date(event.event_date);
            const stamp = Number.isNaN(at.getTime())
              ? event.event_date
              : formatDateTime(at, locale);
            return (
              <li key={event.id} className="text-[13px]">
                <p className="font-medium text-foreground">
                  {event.status_name?.trim() || t("orders.detail.statusUpdated")}
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  <time dateTime={event.event_date}>{stamp}</time>
                </p>
                {event.details?.trim() ? (
                  <p className="mt-1 text-muted-foreground">{event.details.trim()}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

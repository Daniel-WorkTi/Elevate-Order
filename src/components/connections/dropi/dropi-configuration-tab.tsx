import type { DropiConnectionSummary } from "@/lib/integrations/dropi/dropi-types";
import { useT } from "@/lib/i18n/locale-context";

/** Advanced — events + validation only (webhook URL lives in DropiWebhookConfig). */
export function DropiConfigurationTab({ summary }: { summary: DropiConnectionSummary }) {
  const t = useT();

  return (
    <div className="space-y-5">
      <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
        <h2 className="text-[15px] font-semibold text-[#0A0C10]">{t("connections.supportedEvents")}</h2>
        <p className="mt-1 text-[13px] text-[#667085]">{t("connections.supportedEventsHint")}</p>
        <ul className="mt-4 space-y-2 text-[13px] text-[#0A0C10]">
          <li className="rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2">
            {t("connections.singleOrderEvent")}
          </li>
          <li className="rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2">
            {t("connections.batchOrderEvents")}
          </li>
        </ul>
        <p className="mt-3 text-[12px] text-[#667085]">{t("connections.duplicateEventsHint")}</p>
      </section>

      <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
        <h2 className="text-[15px] font-semibold text-[#0A0C10]">
          {t("connections.connectionValidation")}
        </h2>
        <p className="mt-1 text-[13px] text-[#667085]">
          {t("connections.connectionValidationHint")}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-[13px]">
          <div className="rounded-[10px] border border-[#E6E8EC] px-3 py-2.5">
            <dt className="text-[#667085]">{t("connections.webhookAuth")}</dt>
            <dd className="mt-0.5 font-medium text-[#0A0C10]">
              {summary.authConfigured ? t("connections.ready") : t("connections.missing")}
            </dd>
          </div>
          <div className="rounded-[10px] border border-[#E6E8EC] px-3 py-2.5">
            <dt className="text-[#667085]">{t("connections.server")}</dt>
            <dd className="mt-0.5 font-medium text-[#0A0C10]">
              {summary.serverConfigured ? t("connections.ready") : t("connections.missing")}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

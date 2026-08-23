import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";

import type { DropiFieldDefinition } from "@/lib/integrations/dropi/dropi-types";
import { useT } from "@/lib/i18n/locale-context";

const TEMPLATE_FIELD_KEYS = new Set([
  "order_id",
  "status_name",
  "details",
  "tracking_code",
  "tracking_url",
  "shipping_company",
  "total",
  "customer_name",
  "phone",
  "city",
  "postal_code",
  "product_summary",
]);

export function DropiFieldMapping({ fields }: { fields: DropiFieldDefinition[] }) {
  const t = useT();
  const [showFull, setShowFull] = useState(false);

  const templateFields = useMemo(
    () => fields.filter((field) => TEMPLATE_FIELD_KEYS.has(field.key)),
    [fields],
  );

  const visibleFields = showFull ? fields : templateFields;

  function fieldDescription(key: string, fallback: string) {
    const i18nKey = `connections.dropi.field.${key}`;
    const translated = t(i18nKey);
    return translated === i18nKey ? fallback : translated;
  }

  return (
    <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
      <h2 className="text-[15px] font-semibold text-[#0A0C10]">{t("connections.supportedData")}</h2>
      <p className="mt-1 text-[13px] text-[#667085]">{t("connections.supportedDataHint")}</p>

      <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2.5 text-[12px] text-[#667085]">
        <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
        <span>{t("connections.staticFieldsHint")}</span>
      </div>

      <p className="mt-4 text-[12px] font-medium uppercase tracking-wide text-[#667085]">
        {t("connections.availableInTemplates")}
      </p>

      <div className="mt-2 hidden overflow-hidden rounded-[12px] border border-[#E6E8EC] md:block">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#F7F8FA] text-[11px] uppercase tracking-wide text-[#667085]">
            <tr>
              <th className="px-3 py-2.5 font-medium">{t("connections.field")}</th>
              <th className="px-3 py-2.5 font-medium">{t("connections.description")}</th>
              <th className="px-3 py-2.5 font-medium">{t("connections.templatesCol")}</th>
            </tr>
          </thead>
          <tbody>
            {visibleFields.map((field) => (
              <tr key={field.key} className="border-t border-[#E6E8EC]">
                <td className="px-3 py-3 font-mono text-[12px] font-semibold text-[#0A0C10]">
                  {field.label}
                </td>
                <td className="px-3 py-3 text-[#667085]">
                  {fieldDescription(field.key, field.description)}
                </td>
                <td className="px-3 py-3">
                  {field.templateVariable ? (
                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      {t("connections.available")}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#667085]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 space-y-2 md:hidden">
        {visibleFields.map((field) => (
          <div key={field.key} className="rounded-[12px] border border-[#E6E8EC] px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[12px] font-semibold text-[#0A0C10]">{field.label}</p>
              {field.templateVariable ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {t("connections.available")}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[12px] text-[#667085]">
              {fieldDescription(field.key, field.description)}
            </p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowFull((open) => !open)}
        className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#2563EB] hover:text-[#1D4ED8]"
      >
        {showFull ? (
          <ChevronDown className="size-3.5" strokeWidth={1.75} />
        ) : (
          <ChevronRight className="size-3.5" strokeWidth={1.75} />
        )}
        {showFull ? t("connections.hideFullPayload") : t("connections.viewFullPayload")}
      </button>
    </section>
  );
}

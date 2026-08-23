import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  dropeaStatusLabelKey,
  formatDropeaDateTime,
} from "@/lib/integrations/dropea/dropea-format";
import type { DropeaConnectionSummary } from "@/lib/integrations/dropea/dropea-types";
import { useI18n } from "@/lib/i18n/locale-context";

const WEBHOOK_PATH = "/api/public/webhooks/orders";

export function DropeaApiConfig({
  summary,
  credentialsConfigured,
}: {
  summary: DropeaConnectionSummary;
  credentialsConfigured: boolean;
}) {
  const { locale, t } = useI18n();
  const [webhookUrl, setWebhookUrl] = useState(WEBHOOK_PATH);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}${WEBHOOK_PATH}`);
  }, []);

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
        <h2 className="text-[15px] font-semibold text-[#0A0C10]">{t("connections.connectionStatus")}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[12px] text-[#667085]">{t("common.status")}</dt>
            <dd className="mt-1 text-[14px] font-medium text-[#0A0C10]">
              {t(dropeaStatusLabelKey(summary.status))}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-[#667085]">{t("connections.methodLabel")}</dt>
            <dd className="mt-1 text-[14px] font-medium text-[#0A0C10]">
              {t("connections.methodApiHmac")}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-[#667085]">{t("connections.lastSyncActivity")}</dt>
            <dd className="mt-1 text-[14px] font-medium text-[#0A0C10]">
              {formatDropeaDateTime(summary.lastSyncAt, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-[#667085]">{t("connections.server")}</dt>
            <dd className="mt-1 text-[14px] font-medium text-[#0A0C10]">
              {summary.serverConfigured ? t("connections.configured") : t("connections.notConfigured")}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-sky-700" strokeWidth={1.75} />
          <h2 className="text-[15px] font-semibold text-[#0A0C10]">{t("connections.credentials")}</h2>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2.5 text-[13px]">
            <div className="flex items-center gap-2">
              <KeyRound className="size-3.5 text-[#667085]" strokeWidth={1.75} />
              <span className="font-medium text-[#0A0C10]">{t("connections.apiToken")}</span>
            </div>
            <span className="text-[12px] font-semibold text-[#667085]">
              {credentialsConfigured ? t("connections.configured") : t("connections.required")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2.5 text-[13px]">
            <div className="flex items-center gap-2">
              <Shield className="size-3.5 text-[#667085]" strokeWidth={1.75} />
              <span className="font-medium text-[#0A0C10]">{t("connections.hmacSecret")}</span>
            </div>
            <span className="text-[12px] font-semibold text-[#667085]">
              {credentialsConfigured ? t("connections.configured") : t("connections.required")}
            </span>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-[#667085]">{t("connections.credentialsHint")}</p>
      </section>

      <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
        <h2 className="text-[15px] font-semibold text-[#0A0C10]">{t("connections.webhookEndpoint")}</h2>
        <p className="mt-1 text-[13px] text-[#667085]">{t("connections.webhookEndpointHint")}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 break-all rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2.5 font-mono text-[12px] text-[#0A0C10]">
            {webhookUrl}
          </code>
          <Button
            type="button"
            variant="outline"
            onClick={() => void copyWebhook()}
            className="h-9 shrink-0 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-600" strokeWidth={1.75} />
            ) : (
              <Copy className="size-3.5" strokeWidth={1.75} />
            )}
            {copied ? t("connections.copied") : t("connections.copy")}
          </Button>
        </div>
        <p className="mt-3 text-[12px] text-[#667085]">
          {t("connections.apiBase")}{" "}
          <code className="text-[11px]">{summary.apiBaseUrl}/order</code>
        </p>
      </section>
    </div>
  );
}

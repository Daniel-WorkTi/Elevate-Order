import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  dropeaStatusLabel,
  formatDropeaDateTime,
} from "@/lib/integrations/dropea/dropea-format";
import type { DropeaConnectionSummary } from "@/lib/integrations/dropea/dropea-types";

const WEBHOOK_PATH = "/api/public/webhooks/orders";

export function DropeaApiConfig({
  summary,
  credentialsConfigured,
}: {
  summary: DropeaConnectionSummary;
  credentialsConfigured: boolean;
}) {
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
        <h2 className="text-[15px] font-semibold text-[#0A0C10]">Connection status</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[12px] text-[#667085]">Status</dt>
            <dd className="mt-1 text-[14px] font-medium text-[#0A0C10]">
              {dropeaStatusLabel(summary.status)}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-[#667085]">Method</dt>
            <dd className="mt-1 text-[14px] font-medium text-[#0A0C10]">
              API token + HMAC webhooks
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-[#667085]">Last sync activity</dt>
            <dd className="mt-1 text-[14px] font-medium text-[#0A0C10]">
              {formatDropeaDateTime(summary.lastSyncAt)}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-[#667085]">Server</dt>
            <dd className="mt-1 text-[14px] font-medium text-[#0A0C10]">
              {summary.serverConfigured ? "Configured" : "Not configured"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-sky-700" strokeWidth={1.75} />
          <h2 className="text-[15px] font-semibold text-[#0A0C10]">Credentials</h2>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2.5 text-[13px]">
            <div className="flex items-center gap-2">
              <KeyRound className="size-3.5 text-[#667085]" strokeWidth={1.75} />
              <span className="font-medium text-[#0A0C10]">API token</span>
            </div>
            <span className="text-[12px] font-semibold text-[#667085]">
              {credentialsConfigured ? "Configured" : "Required"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2.5 text-[13px]">
            <div className="flex items-center gap-2">
              <Shield className="size-3.5 text-[#667085]" strokeWidth={1.75} />
              <span className="font-medium text-[#0A0C10]">HMAC secret</span>
            </div>
            <span className="text-[12px] font-semibold text-[#667085]">
              {credentialsConfigured ? "Configured" : "Required"}
            </span>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-[#667085]">
          The API token is used as <code className="text-[11px]">X-API-KEY</code> for order polling.
          The HMAC secret verifies that inbound webhooks were signed by Dropea. Values stay in this
          browser for MVP — never as a server env dump.
        </p>
      </section>

      <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
        <h2 className="text-[15px] font-semibold text-[#0A0C10]">Webhook endpoint</h2>
        <p className="mt-1 text-[13px] text-[#667085]">
          Register this URL in Dropea and sign deliveries with your HMAC secret.
        </p>
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
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="mt-3 text-[12px] text-[#667085]">
          API base: <code className="text-[11px]">{summary.apiBaseUrl}/order</code>
        </p>
      </section>
    </div>
  );
}

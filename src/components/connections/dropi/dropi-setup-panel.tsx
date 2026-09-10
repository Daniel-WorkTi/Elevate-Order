import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectionHowTo } from "@/components/connections/workspace/connection-howto";
import type { DropiConnectionStatus } from "@/lib/integrations/dropi/dropi-types";
import { useT } from "@/lib/i18n/locale-context";

/** Dropi setup: copy webhook URL. Status comes from real webhook activity. */
export function DropiSetupPanel({
  webhookUrl,
  loadingUrl,
  urlError,
  serverReady,
  status,
}: {
  webhookUrl: string;
  loadingUrl?: boolean;
  urlError?: string | null;
  serverReady: boolean;
  status: DropiConnectionStatus;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-3">
      {status === "not_configured" || status === "configured" ? (
        <ConnectionHowTo kind="dropi" />
      ) : null}
      <section className="space-y-3 rounded-[16px] border border-[#E6E8EC] bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            readOnly
            value={loadingUrl ? t("connections.generatingWebhookUrl") : webhookUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="h-10 flex-1 rounded-[10px] border-[#E6E8EC] bg-[#F7F8FA] font-mono text-[12px] shadow-none"
          />
          <Button
            type="button"
            variant="outline"
            disabled={!webhookUrl || Boolean(loadingUrl)}
            onClick={() => void copy()}
            className="h-10 shrink-0 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-600" strokeWidth={1.75} />
            ) : (
              <Copy className="size-3.5" strokeWidth={1.75} />
            )}
            {copied ? t("connections.copied") : t("connections.copy")}
          </Button>
        </div>

        {urlError ? <p className="text-[12px] font-medium text-red-600">{urlError}</p> : null}

        {!serverReady ? (
          <p className="text-[12px] text-[#667085]">{t("connections.dropiServerNotReady")}</p>
        ) : status === "configured" ? (
          <p className="text-[12px] text-[#667085]">{t("connections.waitingFirstWebhook")}</p>
        ) : status === "connected" ? (
          <p className="text-[12px] text-emerald-700">{t("connections.dropiReceivingEvents")}</p>
        ) : null}
      </section>
    </div>
  );
}

import { useState } from "react";
import { Check, Copy, Link2, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/locale-context";

/** Minimal Dropi setup: copy production webhook URL + connect. */
export function DropiSetupPanel({
  webhookUrl,
  loadingUrl,
  urlError,
  serverReady,
  linked,
  onConnect,
  onDisconnect,
}: {
  webhookUrl: string;
  loadingUrl?: boolean;
  urlError?: string | null;
  serverReady: boolean;
  linked: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
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
    <section className="space-y-4 rounded-[16px] border border-[#E6E8EC] bg-white p-5">
      <div>
        <h2 className="text-[15px] font-semibold text-[#0A0C10]">{t("connections.connectDropi")}</h2>
        <p className="mt-1 text-[13px] text-[#667085]">{t("connections.connectDropiHint")}</p>
        <p className="mt-2 rounded-[10px] border border-amber-200/80 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900/90">
          {t("connections.dropiPastOrdersNote")}
        </p>
      </div>

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

      <div className="flex flex-wrap gap-2">
        {linked ? (
          <Button
            type="button"
            variant="outline"
            onClick={onDisconnect}
            className="h-9 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
          >
            <Unplug className="size-3.5" strokeWidth={1.75} />
            {t("connections.disconnect")}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onConnect}
            disabled={!serverReady || !webhookUrl || Boolean(loadingUrl)}
            className="h-9 rounded-[10px] bg-[#2563EB] text-[13px] shadow-none hover:bg-[#1D4ED8]"
          >
            <Link2 className="size-3.5" strokeWidth={1.75} />
            {t("connections.connectDropiCta")}
          </Button>
        )}
        {linked ? (
          <span className="inline-flex items-center gap-1.5 self-center text-[12px] font-semibold text-emerald-700">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
            {t("connections.connected")}
          </span>
        ) : null}
      </div>
    </section>
  );
}

import { useState } from "react";
import { Check, Copy, Link2, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/locale-context";

/** Minimal Dropi setup: copy webhook URL + connect. */
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
  waitingForEvents?: boolean;
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
    </section>
  );
}

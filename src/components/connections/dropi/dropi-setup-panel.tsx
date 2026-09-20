import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectionHowTo } from "@/components/connections/workspace/connection-howto";
import type { ConnectionPanelVariant } from "@/components/connections/store/store-connect-panel";
import type { DropiConnectionStatus } from "@/lib/integrations/dropi/dropi-types";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

/** Dropi setup: copy webhook URL. Status comes from real webhook activity. */
export function DropiSetupPanel({
  webhookUrl,
  loadingUrl,
  urlError,
  serverReady,
  status,
  variant = "connections",
}: {
  webhookUrl: string;
  loadingUrl?: boolean;
  urlError?: string | null;
  serverReady: boolean;
  status: DropiConnectionStatus;
  variant?: ConnectionPanelVariant;
}) {
  const t = useT();
  const onboarding = variant === "onboarding";
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

  if (onboarding && status === "connected") {
    return (
      <section className="rounded-[14px] border border-border bg-card px-5 py-6 text-center shadow-[var(--shadow-card)]">
        <p className="text-[15px] font-semibold text-emerald-800">
          ✓ {t("onboarding.setup.dropi.connected")}
        </p>
      </section>
    );
  }

  if (onboarding) {
    return (
      <section className="space-y-5 rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[color:var(--elevate-blue-soft)] text-[12px] font-semibold text-[color:var(--elevate-blue)]">
              1
            </span>
            <div>
              <p className="text-[13px] text-muted-foreground">{t("onboarding.setup.dropi.step1Lead")}</p>
              <p className="mt-1 text-[14px] font-semibold text-foreground">
                {t("onboarding.setup.dropi.step1Path")}
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[color:var(--elevate-blue-soft)] text-[12px] font-semibold text-[color:var(--elevate-blue)]">
              2
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-foreground">{t("onboarding.setup.dropi.step2")}</p>
              <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  readOnly
                  value={loadingUrl ? t("connections.generatingWebhookUrl") : webhookUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  className="h-10 flex-1 rounded-[10px] border-border bg-[#F7F8FA] font-mono text-[12px] shadow-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!webhookUrl || Boolean(loadingUrl)}
                  onClick={() => void copy()}
                  className="h-10 shrink-0 rounded-[10px] border-border text-[13px] shadow-none"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-600" strokeWidth={1.75} />
                  ) : (
                    <Copy className="size-3.5" strokeWidth={1.75} />
                  )}
                  {copied ? t("connections.copied") : t("connections.copy")}
                </Button>
              </div>
              {urlError ? <p className="mt-1.5 text-[12px] font-medium text-red-600">{urlError}</p> : null}
            </div>
          </li>
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[color:var(--elevate-blue-soft)] text-[12px] font-semibold text-[color:var(--elevate-blue)]">
              3
            </span>
            <p className="pt-1 text-[13px] text-foreground">{t("onboarding.setup.dropi.step3")}</p>
          </li>
        </ol>

        <div
          className={cn(
            "rounded-[10px] border px-3.5 py-3 text-[13px]",
            !serverReady
              ? "border-border bg-[#F7F8FA] text-muted-foreground"
              : status === "configured"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-border bg-[#F7F8FA] text-muted-foreground",
          )}
        >
          {!serverReady
            ? t("connections.dropiServerNotReady")
            : status === "configured"
              ? t("onboarding.setup.dropi.waiting")
              : t("onboarding.setup.dropi.waiting")}
        </div>
      </section>
    );
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

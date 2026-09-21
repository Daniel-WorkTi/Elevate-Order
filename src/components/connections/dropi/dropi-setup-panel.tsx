import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectionHowTo } from "@/components/connections/workspace/connection-howto";
import type { ConnectionPanelVariant } from "@/components/connections/store/store-connect-panel";
import type { DropiConnectionStatus } from "@/lib/integrations/dropi/dropi-types";
import { useT } from "@/lib/i18n/locale-context";

/** Dropi setup: copy webhook URL. Connected only after real inbound events. */
export function DropiSetupPanel({
  webhookUrl,
  loadingUrl,
  urlError,
  serverReady,
  status,
  variant = "connections",
  configuredByUser = false,
  onConfiguredByUserChange,
}: {
  webhookUrl: string;
  loadingUrl?: boolean;
  urlError?: string | null;
  serverReady: boolean;
  status: DropiConnectionStatus;
  variant?: ConnectionPanelVariant;
  /** Onboarding: user confirmed paste+save in Dropi (not Connected). */
  configuredByUser?: boolean;
  onConfiguredByUserChange?: (confirmed: boolean) => void;
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

  if (onboarding && (configuredByUser || status === "connected")) {
    return (
      <section className="space-y-3 rounded-[16px] border border-[#E6E8EC] bg-white px-7 py-8 text-center shadow-[var(--shadow-card)] sm:px-8">
        <p className="text-[16px] font-semibold text-emerald-800">
          ✓ {t("onboarding.setup.dropi.configComplete")}
        </p>
        <p className="mx-auto max-w-[480px] text-[14px] leading-relaxed text-muted-foreground">
          {t("onboarding.setup.dropi.configCompleteHint")}
        </p>
      </section>
    );
  }

  if (onboarding) {
    return (
      <section className="space-y-7 rounded-[16px] border border-[#E6E8EC] bg-white p-7 shadow-[var(--shadow-card)] sm:p-8">
        <ol className="space-y-6">
          <li className="flex gap-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color:var(--elevate-blue-soft)] text-[13px] font-semibold tabular-nums text-[color:var(--elevate-blue)]">
              01
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[15px] font-semibold text-foreground">
                {t("onboarding.setup.dropi.step1Title")}
              </p>
              <p className="mt-2 text-[14px] font-semibold text-foreground">
                {t("onboarding.setup.dropi.step1Path")}
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color:var(--elevate-blue-soft)] text-[13px] font-semibold tabular-nums text-[color:var(--elevate-blue)]">
              02
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[15px] font-semibold text-foreground">
                {t("onboarding.setup.dropi.step2Title")}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {t("onboarding.setup.dropi.step2")}
              </p>
              <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Input
                  readOnly
                  value={loadingUrl ? t("connections.generatingWebhookUrl") : webhookUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  className="h-11 flex-1 rounded-[10px] border-border bg-[#F7F8FA] font-mono text-[13px] shadow-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!webhookUrl || Boolean(loadingUrl)}
                  onClick={() => void copy()}
                  className="h-11 shrink-0 rounded-[10px] border-border text-[14px] shadow-none"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-600" strokeWidth={1.75} />
                  ) : (
                    <Copy className="size-3.5" strokeWidth={1.75} />
                  )}
                  {copied ? t("connections.copied") : t("connections.copy")}
                </Button>
              </div>
              {urlError ? <p className="mt-2 text-[13px] font-medium text-red-600">{urlError}</p> : null}
            </div>
          </li>
          <li className="flex gap-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color:var(--elevate-blue-soft)] text-[13px] font-semibold tabular-nums text-[color:var(--elevate-blue)]">
              03
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[15px] font-semibold text-foreground">
                {t("onboarding.setup.dropi.step3Title")}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {t("onboarding.setup.dropi.step3Lead")}
              </p>
            </div>
          </li>
        </ol>

        {!serverReady ? (
          <p className="text-[14px] text-muted-foreground">{t("connections.dropiServerNotReady")}</p>
        ) : null}

        <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#E6E8EC] bg-[#F7F8FA] px-4 py-4">
          <input
            type="checkbox"
            checked={configuredByUser}
            disabled={!webhookUrl || Boolean(loadingUrl) || !serverReady}
            onChange={(event) => onConfiguredByUserChange?.(event.target.checked)}
            className="mt-0.5 size-4 rounded border-border text-[color:var(--elevate-blue)] focus-visible:ring-[color:var(--elevate-blue)]/40"
          />
          <span className="text-[14px] leading-snug text-foreground">
            {t("onboarding.setup.dropi.confirmSaved")}
          </span>
        </label>
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

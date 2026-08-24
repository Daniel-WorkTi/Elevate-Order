import { useState } from "react";
import { Check, Copy, Eye, EyeOff, Link2, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectionHowTo } from "@/components/connections/workspace/connection-howto";
import type { DropeaConnectCredentials } from "@/hooks/use-dropea-connection-preference";
import { useT } from "@/lib/i18n/locale-context";

/** Minimal Dropea setup: credentials + webhook URL. */
export function DropeaSetupPanel({
  linked,
  apiTokenConfigured,
  hmacSecretConfigured,
  serverReady,
  webhookUrl,
  loadingUrl,
  urlError,
  onConnect,
  onDisconnect,
}: {
  linked: boolean;
  apiTokenConfigured: boolean;
  hmacSecretConfigured: boolean;
  serverReady: boolean;
  webhookUrl: string;
  loadingUrl?: boolean;
  urlError?: string | null;
  onConnect: (credentials: DropeaConnectCredentials) => boolean;
  onDisconnect: () => void;
}) {
  const t = useT();
  const [apiToken, setApiToken] = useState("");
  const [hmacSecret, setHmacSecret] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showHmac, setShowHmac] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fullyLinked = linked && apiTokenConfigured && hmacSecretConfigured;

  async function copyWebhook() {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  const webhookBlock = (
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
        onClick={() => void copyWebhook()}
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
  );

  if (fullyLinked) {
    return (
      <section className="space-y-3 rounded-[16px] border border-[#E6E8EC] bg-white p-4">
        {webhookBlock}
        {urlError ? <p className="text-[12px] font-medium text-red-600">{urlError}</p> : null}
        <Button
          type="button"
          variant="outline"
          onClick={onDisconnect}
          className="h-9 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
        >
          <Unplug className="size-3.5" strokeWidth={1.75} />
          {t("connections.disconnect")}
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <ConnectionHowTo kind="dropea" />
      <section className="space-y-3 rounded-[16px] border border-[#E6E8EC] bg-white p-4">
        <SecretField
          id="dropea-api-token"
          label={t("connections.apiToken")}
          placeholder={t("connections.pasteApiTokenShort")}
          value={apiToken}
          show={showToken}
          onShowChange={setShowToken}
          onChange={(value) => {
            setApiToken(value);
            setError(null);
          }}
        />

        <SecretField
          id="dropea-hmac-secret"
          label={t("connections.hmacSecret")}
          placeholder={t("connections.pasteHmacShort")}
          value={hmacSecret}
          show={showHmac}
          onShowChange={setShowHmac}
          onChange={(value) => {
            setHmacSecret(value);
            setError(null);
          }}
        />

        {webhookBlock}
        {urlError ? <p className="text-[12px] font-medium text-red-600">{urlError}</p> : null}

        <Button
          type="button"
          disabled={!serverReady}
          onClick={() => {
            const ok = onConnect({ apiToken, hmacSecret });
            if (!ok) {
              setError(t("connections.enterBothToConnect"));
              return;
            }
            setApiToken("");
            setHmacSecret("");
          }}
          className="h-10 rounded-[10px] bg-[#2563EB] text-[13px] shadow-none hover:bg-[#1D4ED8]"
        >
          <Link2 className="size-3.5" strokeWidth={1.75} />
          {t("connections.connectDropea")}
        </Button>

        {error ? <p className="text-[12px] font-medium text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}

function SecretField({
  id,
  label,
  placeholder,
  value,
  show,
  onShowChange,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  show: boolean;
  onShowChange: (show: boolean) => void;
  onChange: (value: string) => void;
}) {
  const t = useT();
  return (
    <div>
      <label htmlFor={id} className="text-[12px] font-medium text-[#667085]">
        {label}
      </label>
      <div className="relative mt-1.5">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-10 rounded-[10px] border-[#E6E8EC] pr-10 shadow-none"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#667085] hover:text-[#0A0C10]"
          onClick={() => onShowChange(!show)}
          aria-label={
            show
              ? t("connections.hideCredential", { label })
              : t("connections.showCredential", { label })
          }
        >
          {show ? (
            <EyeOff className="size-4" strokeWidth={1.5} />
          ) : (
            <Eye className="size-4" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </div>
  );
}

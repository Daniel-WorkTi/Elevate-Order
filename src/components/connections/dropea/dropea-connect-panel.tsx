import { useState } from "react";
import { Eye, EyeOff, KeyRound, Link2, Shield, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DropeaConnectionStatus } from "@/lib/integrations/dropea/dropea-types";
import type { DropeaConnectCredentials } from "@/hooks/use-dropea-connection-preference";
import { useT } from "@/lib/i18n/locale-context";

export function DropeaConnectPanel({
  linked,
  apiTokenConfigured,
  hmacSecretConfigured,
  status,
  serverReady,
  onConnect,
  onDisconnect,
}: {
  linked: boolean;
  apiTokenConfigured: boolean;
  hmacSecretConfigured: boolean;
  status: DropeaConnectionStatus;
  serverReady: boolean;
  onConnect: (credentials: DropeaConnectCredentials) => boolean;
  onDisconnect: () => void;
}) {
  const t = useT();
  const [apiToken, setApiToken] = useState("");
  const [hmacSecret, setHmacSecret] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showHmac, setShowHmac] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullyLinked = linked && apiTokenConfigured && hmacSecretConfigured;

  if (fullyLinked) {
    return (
      <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-[#0A0C10]">{t("connections.dropeaLinked")}</h2>
            <p className="mt-1 text-[13px] text-[#667085]">
              {status === "connected"
                ? t("connections.dropeaOrdersPresent")
                : t("connections.dropeaWaitingSync")}
            </p>
            <div className="mt-3 space-y-2">
              <MaskedCredentialRow icon={KeyRound} label={t("connections.apiToken")} />
              <MaskedCredentialRow icon={Shield} label={t("connections.hmacSecret")} />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onDisconnect}
            className="h-9 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
          >
            <Unplug className="size-3.5" strokeWidth={1.75} />
            {t("connections.disconnect")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
      <h2 className="text-[15px] font-semibold text-[#0A0C10]">{t("connections.connectDropea")}</h2>
      <p className="mt-1 max-w-xl text-[13px] text-[#667085]">
        {t("connections.dropeaConnectDesc")}
      </p>

      <div className="mt-4 space-y-3">
        <SecretField
          id="dropea-api-token"
          label={t("connections.apiToken")}
          placeholder={t("connections.pasteApiToken")}
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
          label={t("connections.hmacSecretWebhook")}
          placeholder={t("connections.pasteHmacSecret")}
          value={hmacSecret}
          show={showHmac}
          onShowChange={setShowHmac}
          onChange={(value) => {
            setHmacSecret(value);
            setError(null);
          }}
        />

        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
          <Button
            type="button"
            disabled={!serverReady}
            onClick={() => {
              const ok = onConnect({ apiToken, hmacSecret });
              if (!ok) {
                setError(t("connections.enterBothCredentials"));
                return;
              }
              setApiToken("");
              setHmacSecret("");
            }}
            className="h-10 shrink-0 rounded-[10px] bg-[#2563EB] text-[13px] shadow-none hover:bg-[#1D4ED8]"
          >
            <Link2 className="size-3.5" strokeWidth={1.75} />
            {t("connections.connectDropea")}
          </Button>
        </div>

        {error ? <p className="text-[12px] font-medium text-red-600">{error}</p> : null}
        {!serverReady ? (
          <p className="text-[12px] font-medium text-amber-700">
            {t("connections.serverSyncNotReady")}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function MaskedCredentialRow({
  icon: Icon,
  label,
}: {
  icon: typeof KeyRound;
  label: string;
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2 text-[13px]">
      <Icon className="size-3.5 text-[#667085]" strokeWidth={1.75} />
      <span className="font-medium text-[#0A0C10]">{label}</span>
      <span className="tabular-nums text-[#667085]">••••••••••••••••</span>
      <span className="ml-auto text-[11px] font-semibold text-emerald-700">
        {t("connections.configured")}
      </span>
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

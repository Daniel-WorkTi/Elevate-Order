import { useState } from "react";
import { Eye, EyeOff, Link2, RefreshCw, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectionHowTo } from "@/components/connections/workspace/connection-howto";
import type { StoreConnectInput } from "@/hooks/use-store-connection-preference";
import { normalizeShopifyDomain } from "@/lib/integrations/shopify/shopify-normalize";
import { useT } from "@/lib/i18n/locale-context";

export function StoreConnectPanel({
  linked,
  storeName,
  storeDomain,
  onConnect,
  onDisconnect,
  oauthConfigured = false,
  oauthShop = null,
  oauthError = false,
  onOauthInstall,
  onSync,
  syncing = false,
}: {
  linked: boolean;
  storeName: string | null;
  storeDomain: string | null;
  accessTokenConfigured?: boolean;
  onConnect: (input: StoreConnectInput) => boolean;
  onDisconnect: () => void;
  oauthConfigured?: boolean;
  oauthShop?: string | null;
  oauthError?: boolean;
  onOauthInstall?: (shop: string) => void;
  onSync?: () => void;
  syncing?: boolean;
}) {
  const t = useT();
  const [domain, setDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [oauthShopInput, setOauthShopInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (linked) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#E6E8EC] bg-white px-4 py-4">
        <p className="min-w-0 font-mono text-[13px] text-[#0A0C10]">
          {oauthShop ?? storeDomain ?? storeName}
        </p>
        <div className="flex flex-wrap gap-2">
          {onSync ? (
            <Button
              type="button"
              onClick={onSync}
              disabled={syncing}
              className="h-9 rounded-[10px] bg-[#2563EB] text-[13px] shadow-none hover:bg-[#1D4ED8]"
            >
              <RefreshCw className={syncing ? "size-3.5 animate-spin" : "size-3.5"} strokeWidth={1.75} />
              {t("connections.syncNow")}
            </Button>
          ) : null}
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

  const showOauth = Boolean(oauthConfigured && onOauthInstall);

  function submitToken() {
    const host = normalizeShopifyDomain(domain);
    if (!host) {
      setError(t("connections.domainInvalid"));
      return;
    }
    const ok = onConnect({
      storeName: host,
      storeDomain: domain,
      accessToken,
    });
    if (!ok) setError(t("connections.enterStoreFields"));
  }

  return (
    <div className="space-y-3">
      <ConnectionHowTo kind="shopify" />
      <section className="space-y-3 rounded-[16px] border border-[#E6E8EC] bg-white p-4">
      {oauthError ? (
        <p className="text-[13px] font-medium text-red-600">{t("connections.shopifyOauthError")}</p>
      ) : null}

      {showOauth ? (
        <>
          <p className="text-[13px] leading-5 text-[#667085]">{t("connections.shopifyCookieHint")}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="shopify-shop"
              value={oauthShopInput}
              onChange={(event) => {
                setOauthShopInput(event.target.value);
                setError(null);
              }}
              placeholder={t("connections.shopifyShopPlaceholder")}
              className="h-10 flex-1 rounded-[10px] border-[#E6E8EC] font-mono text-[13px] shadow-none"
            />
            <Button
              type="button"
              onClick={() => {
                const host = normalizeShopifyDomain(oauthShopInput);
                if (!host) {
                  setError(t("connections.domainInvalid"));
                  return;
                }
                onOauthInstall!(host);
              }}
              className="h-10 rounded-[10px] bg-[#2563EB] text-[13px] shadow-none hover:bg-[#1D4ED8]"
            >
              <Link2 className="size-3.5" strokeWidth={1.75} />
              {t("connections.installShopify")}
            </Button>
          </div>
          <p className="text-[12px] font-medium text-[#667085]">{t("connections.orUseAdminToken")}</p>
        </>
      ) : null}

      <Input
        value={domain}
        onChange={(event) => {
          setDomain(event.target.value);
          setError(null);
        }}
        placeholder={t("connections.shopifyShopPlaceholder")}
        className="h-10 rounded-[10px] border-[#E6E8EC] font-mono text-[13px] shadow-none"
      />
      <div className="relative">
        <Input
          type={showToken ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          value={accessToken}
          onChange={(event) => {
            setAccessToken(event.target.value);
            setError(null);
          }}
          placeholder="shpat_…"
          className="h-10 rounded-[10px] border-[#E6E8EC] pr-10 font-mono text-[13px] shadow-none"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#667085]"
          onClick={() => setShowToken((value) => !value)}
          aria-label={showToken ? t("connections.hideToken") : t("connections.showToken")}
        >
          {showToken ? (
            <EyeOff className="size-4" strokeWidth={1.5} />
          ) : (
            <Eye className="size-4" strokeWidth={1.5} />
          )}
        </button>
      </div>
      <Button
        type="button"
        onClick={submitToken}
        variant={showOauth ? "outline" : "default"}
        className={
          showOauth
            ? "h-10 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
            : "h-10 rounded-[10px] bg-[#2563EB] text-[13px] shadow-none hover:bg-[#1D4ED8]"
        }
      >
        <Link2 className="size-3.5" strokeWidth={1.75} />
        {t("connections.connectStoreCta")}
      </Button>

      {error ? <p className="text-[12px] font-medium text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}

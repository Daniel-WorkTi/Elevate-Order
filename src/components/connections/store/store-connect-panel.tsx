import { useState } from "react";
import { Eye, EyeOff, KeyRound, Link2, Store, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StoreConnectInput } from "@/hooks/use-store-connection-preference";
import { normalizeShopifyDomain } from "@/lib/integrations/shopify/shopify-normalize";
import { useT } from "@/lib/i18n/locale-context";

export function StoreConnectPanel({
  linked,
  storeName,
  storeDomain,
  accessTokenConfigured,
  onConnect,
  onDisconnect,
  oauthConfigured = false,
  oauthShop = null,
  oauthError = false,
  onOauthInstall,
}: {
  linked: boolean;
  storeName: string | null;
  storeDomain: string | null;
  accessTokenConfigured: boolean;
  onConnect: (input: StoreConnectInput) => boolean;
  onDisconnect: () => void;
  oauthConfigured?: boolean;
  oauthShop?: string | null;
  oauthError?: boolean;
  onOauthInstall?: (shop: string) => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [oauthShopInput, setOauthShopInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const oauthLinked = Boolean(oauthShop);

  if (linked) {
    return (
      <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-[#0A0C10]">{t("connections.storeLinked")}</h2>
            <p className="mt-1 text-[13px] text-[#667085]">{t("connections.storeLinkedHint")}</p>
            <div className="mt-3 space-y-2">
              {storeName ? <InfoRow label={t("connections.storeName")} value={storeName} /> : null}
              <InfoRow
                label={t("connections.shopifyConnectedStore")}
                value={oauthShop ?? storeDomain}
                mono
              />
              {storeDomain && !oauthLinked && !normalizeShopifyDomain(storeDomain) ? (
                <p className="rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">
                  {t("connections.wrongDomainHint")}
                </p>
              ) : null}
              {oauthLinked ? (
                <p className="rounded-[10px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-800">
                  {t("connections.authorizedViaShopify")}
                </p>
              ) : (
                <div className="flex items-center gap-2 rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2 text-[13px]">
                  <KeyRound className="size-3.5 text-[#667085]" strokeWidth={1.75} />
                  <span className="font-medium text-[#0A0C10]">{t("connections.adminApiToken")}</span>
                  <span className="tabular-nums text-[#667085]">••••••••••••••••</span>
                  <span className="ml-auto text-[11px] font-semibold text-emerald-700">
                    {accessTokenConfigured ? t("connections.configured") : t("connections.missing")}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onDisconnect}
            className="h-9 shrink-0 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
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
      <div className="flex items-center gap-2">
        <Store className="size-4 text-[#2563EB]" strokeWidth={1.75} />
        <h2 className="text-[15px] font-semibold text-[#0A0C10]">{t("connections.connectStore")}</h2>
      </div>
      <p className="mt-1 max-w-xl text-[13px] text-[#667085]">{t("connections.connectStoreHint")}</p>

      {oauthError ? (
        <p className="mt-3 rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">
          {t("connections.shopifyOauthError")}
        </p>
      ) : null}

      {onOauthInstall ? (
        <div className="mt-4 space-y-3">
          <label htmlFor="shopify-shop" className="text-[12px] font-medium text-[#667085]">
            {t("connections.shopifyDomain")}
          </label>
          <Input
            id="shopify-shop"
            value={oauthShopInput}
            onChange={(event) => {
              setOauthShopInput(event.target.value);
              setError(null);
            }}
            placeholder={t("connections.shopifyShopPlaceholder")}
            className="h-10 rounded-[10px] border-[#E6E8EC] font-mono text-[13px] shadow-none"
            disabled={!oauthConfigured}
          />
          <p className="text-[12px] text-[#667085]">{t("connections.shopifyAdminUrlHint")}</p>
          {!oauthConfigured ? (
            <p className="text-[12px] font-medium text-amber-800">{t("connections.shopifyOauthMissing")}</p>
          ) : (
            <Button
              type="button"
              onClick={() => {
                const host = normalizeShopifyDomain(oauthShopInput);
                if (!host) {
                  setError(t("connections.domainInvalid"));
                  return;
                }
                onOauthInstall(host);
              }}
              className="h-10 rounded-[10px] bg-[#2563EB] text-[13px] shadow-none hover:bg-[#1D4ED8]"
            >
              <Link2 className="size-3.5" strokeWidth={1.75} />
              {t("connections.installShopify")}
            </Button>
          )}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-[12px] font-medium text-red-600">{error}</p> : null}

      <details className="mt-5 rounded-[12px] border border-[#E6E8EC] bg-[#F7F8FA] p-4">
        <summary className="cursor-pointer text-[13px] font-medium text-[#667085]">
          {t("connections.advancedTokenOption")}
        </summary>
        <p className="mt-2 text-[12px] text-[#667085]">{t("connections.advancedTokenHint")}</p>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="store-name" className="text-[12px] font-medium text-[#667085]">
              {t("connections.storeName")}
            </label>
            <Input
              id="store-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              placeholder="Erono Store"
              className="mt-1.5 h-10 rounded-[10px] border-[#E6E8EC] bg-white shadow-none"
            />
          </div>
          <div>
            <label htmlFor="store-domain" className="text-[12px] font-medium text-[#667085]">
              {t("connections.shopifyDomain")}
            </label>
            <Input
              id="store-domain"
              value={domain}
              onChange={(event) => {
                setDomain(event.target.value);
                setError(null);
              }}
              placeholder="loja.myshopify.com"
              className="mt-1.5 h-10 rounded-[10px] border-[#E6E8EC] bg-white font-mono text-[13px] shadow-none"
            />
          </div>
          <div>
            <label htmlFor="store-token" className="text-[12px] font-medium text-[#667085]">
              {t("connections.adminApiAccessToken")}
            </label>
            <div className="relative mt-1.5">
              <Input
                id="store-token"
                type={showToken ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                value={accessToken}
                onChange={(event) => {
                  setAccessToken(event.target.value);
                  setError(null);
                }}
                placeholder="shpat_…"
                className="h-10 rounded-[10px] border-[#E6E8EC] bg-white pr-10 font-mono text-[13px] shadow-none"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#667085] hover:text-[#0A0C10]"
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
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!domain.trim()) {
                setError(t("connections.domainRequired"));
                return;
              }
              if (!normalizeShopifyDomain(domain)) {
                setError(t("connections.domainInvalid"));
                return;
              }
              const ok = onConnect({ storeName: name, storeDomain: domain, accessToken });
              if (!ok) {
                setError(t("connections.enterStoreFields"));
                return;
              }
              setName("");
              setDomain("");
              setAccessToken("");
            }}
            className="h-10 rounded-[10px] border-[#E6E8EC] bg-white text-[13px] shadow-none"
          >
            {t("connections.connectStoreCta")}
          </Button>
        </div>
      </details>
    </section>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#667085]">{label}</p>
      <p
        className={
          mono
            ? "mt-0.5 font-mono text-[13px] text-[#0A0C10]"
            : "mt-0.5 text-[14px] font-semibold text-[#0A0C10]"
        }
      >
        {value}
      </p>
    </div>
  );
}

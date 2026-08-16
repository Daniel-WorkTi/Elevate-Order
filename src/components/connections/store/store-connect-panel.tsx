import { useState } from "react";
import { Eye, EyeOff, KeyRound, Link2, Store, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StoreConnectInput } from "@/hooks/use-store-connection-preference";

export function StoreConnectPanel({
  linked,
  storeName,
  storeDomain,
  accessTokenConfigured,
  onConnect,
  onDisconnect,
}: {
  linked: boolean;
  storeName: string | null;
  storeDomain: string | null;
  accessTokenConfigured: boolean;
  onConnect: (input: StoreConnectInput) => boolean;
  onDisconnect: () => void;
}) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (linked) {
    return (
      <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-[#0A0C10]">Store linked to this workspace</h2>
            <p className="mt-1 text-[13px] text-[#667085]">
              Shopify is connected. Use Sync now to pull orders with customer, product and tracking
              data into ELEVATE.
            </p>
            <div className="mt-3 space-y-2">
              <InfoRow label="Store name" value={storeName} />
              <InfoRow label="Domain" value={storeDomain} mono />
              <div className="flex items-center gap-2 rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2 text-[13px]">
                <KeyRound className="size-3.5 text-[#667085]" strokeWidth={1.75} />
                <span className="font-medium text-[#0A0C10]">Admin API token</span>
                <span className="tabular-nums text-[#667085]">••••••••••••••••</span>
                <span className="ml-auto text-[11px] font-semibold text-emerald-700">
                  {accessTokenConfigured ? "Configured" : "Missing"}
                </span>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onDisconnect}
            className="h-9 shrink-0 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
          >
            <Unplug className="size-3.5" strokeWidth={1.75} />
            Disconnect
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
      <div className="flex items-center gap-2">
        <Store className="size-4 text-[#2563EB]" strokeWidth={1.75} />
        <h2 className="text-[15px] font-semibold text-[#0A0C10]">Connect your store</h2>
      </div>
      <p className="mt-1 max-w-xl text-[13px] text-[#667085]">
        Connect Shopify with an Admin API access token so ELEVATE can fetch complete orders
        (customer, phone, address, products, tracking) — same data model as Dropi / Dropea.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="store-name" className="text-[12px] font-medium text-[#667085]">
            Store name
          </label>
          <Input
            id="store-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder="Erono Store"
            className="mt-1.5 h-10 rounded-[10px] border-[#E6E8EC] shadow-none"
          />
        </div>

        <div>
          <label htmlFor="store-domain" className="text-[12px] font-medium text-[#667085]">
            Shopify domain
          </label>
          <Input
            id="store-domain"
            value={domain}
            onChange={(event) => {
              setDomain(event.target.value);
              setError(null);
            }}
            placeholder="your-shop.myshopify.com"
            className="mt-1.5 h-10 rounded-[10px] border-[#E6E8EC] font-mono text-[13px] shadow-none"
          />
        </div>

        <div>
          <label htmlFor="store-token" className="text-[12px] font-medium text-[#667085]">
            Admin API access token
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
              className="h-10 rounded-[10px] border-[#E6E8EC] pr-10 font-mono text-[13px] shadow-none"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#667085] hover:text-[#0A0C10]"
              onClick={() => setShowToken((value) => !value)}
              aria-label={showToken ? "Hide token" : "Show token"}
            >
              {showToken ? (
                <EyeOff className="size-4" strokeWidth={1.5} />
              ) : (
                <Eye className="size-4" strokeWidth={1.5} />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-[#667085]">
            Create a custom app in Shopify Admin → Settings → Apps → Develop apps. Needs{" "}
            <code className="text-[10px]">read_orders</code> (and ideally{" "}
            <code className="text-[10px]">read_customers</code>).
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            const ok = onConnect({ storeName: name, storeDomain: domain, accessToken });
            if (!ok) {
              setError("Enter store name, domain, and Admin API access token.");
              return;
            }
            setName("");
            setDomain("");
            setAccessToken("");
          }}
          className="h-10 rounded-[10px] bg-[#2563EB] text-[13px] shadow-none hover:bg-[#1D4ED8]"
        >
          <Link2 className="size-3.5" strokeWidth={1.75} />
          Connect store
        </Button>

        {error ? <p className="text-[12px] font-medium text-red-600">{error}</p> : null}
      </div>
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

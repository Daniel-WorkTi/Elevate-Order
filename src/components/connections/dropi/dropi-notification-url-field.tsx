import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, Webhook } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isLocalWebhookHost,
  useDropiPublicWebhookBase,
} from "@/hooks/use-dropi-public-webhook-base";
import { DROPI_WEBHOOK_PATH } from "@/lib/integrations/dropi/dropi-fields";

/**
 * Advanced-only: public webhook URL to paste in Dropi
 * (“order update notifications” / single POST endpoint).
 */
export function DropiNotificationUrlField({
  webhookPath = DROPI_WEBHOOK_PATH,
}: {
  webhookPath?: string;
}) {
  const { publicBase, setPublicBase } = useDropiPublicWebhookBase();
  const [pageOrigin, setPageOrigin] = useState("");
  const [baseDraft, setBaseDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [baseError, setBaseError] = useState<string | null>(null);

  useEffect(() => {
    setPageOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setBaseDraft(publicBase);
  }, [publicBase]);

  const effectiveOrigin = publicBase || pageOrigin;
  const isLocal = effectiveOrigin ? isLocalWebhookHost(effectiveOrigin) : false;
  const webhookUrl = useMemo(() => {
    if (!effectiveOrigin) return webhookPath;
    return `${effectiveOrigin.replace(/\/+$/, "")}${webhookPath}`;
  }, [effectiveOrigin, webhookPath]);

  async function copy() {
    if (isLocal) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  function savePublicBase() {
    const trimmed = baseDraft.trim();
    if (!trimmed) {
      setPublicBase("");
      setBaseError(null);
      return;
    }
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "https:") {
        setBaseError("Dropi requires a public HTTPS URL (e.g. Vercel). Localhost will not work.");
        return;
      }
      if (isLocalWebhookHost(url.origin)) {
        setBaseError("Do not use localhost — Dropi cannot reach your machine.");
        return;
      }
      setPublicBase(url.origin);
      setBaseError(null);
    } catch {
      setBaseError("Invalid URL. Example: https://your-app.vercel.app");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Webhook className="size-4 text-[#2563EB]" strokeWidth={1.75} />
        <p className="text-[14px] font-semibold text-[#0A0C10]">Order update notifications</p>
      </div>
      <p className="text-[13px] text-[#667085]">
        Dropi uses a single POST webhook. Paste this public HTTPS URL into Dropi’s order-update
        notifications field. Localhost is not reachable by Dropi.
      </p>

      {isLocal ? (
        <div className="flex items-start gap-2 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-900">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
          <div>
            <p className="font-semibold">Webhook not reachable from Dropi</p>
            <p className="mt-0.5">
              Deploy ELEVATE (Vercel) and set the public base URL below before saving in Dropi.
            </p>
          </div>
        </div>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-[12px] font-medium text-[#667085]">Public deploy base (Vercel)</span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={baseDraft}
            placeholder="https://your-app.vercel.app"
            onChange={(event) => {
              setBaseDraft(event.target.value);
              setBaseError(null);
            }}
            onBlur={savePublicBase}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                savePublicBase();
              }
            }}
            className="h-10 flex-1 rounded-[10px] border-[#E6E8EC] bg-white font-mono text-[12px] shadow-none"
          />
          <Button
            type="button"
            variant="outline"
            onClick={savePublicBase}
            className="h-10 shrink-0 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
          >
            Apply
          </Button>
        </div>
        {baseError ? <p className="text-[12px] font-medium text-red-600">{baseError}</p> : null}
      </label>

      <label className="block space-y-1.5">
        <span className="text-[12px] font-medium text-[#667085]">Webhook URL</span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            readOnly
            value={webhookUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="h-10 flex-1 rounded-[10px] border-[#E6E8EC] bg-[#F7F8FA] font-mono text-[12px] shadow-none"
          />
          <Button
            type="button"
            variant="outline"
            disabled={isLocal}
            onClick={() => void copy()}
            className="h-10 shrink-0 rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-600" strokeWidth={1.75} />
            ) : (
              <Copy className="size-3.5" strokeWidth={1.75} />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </label>
    </div>
  );
}

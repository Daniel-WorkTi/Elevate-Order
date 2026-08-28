import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { loadMetaSdk, startWhatsAppEmbeddedSignup } from "@/lib/integrations/whatsapp/meta-sdk";
import type {
  WhatsAppEmbeddedSignupCompletePayload,
  WhatsAppEmbeddedSignupCancelReason,
} from "@/lib/integrations/whatsapp/meta-sdk";
import { cn } from "@/lib/utils";

type WhatsAppEmbeddedSignupButtonProps = {
  appId: string;
  configId: string;
  sdkVersion: string;
  disabled?: boolean;
  className?: string;
  connectLabel: string;
  loadingLabel: string;
  onComplete: (payload: WhatsAppEmbeddedSignupCompletePayload) => void;
  onCancel: (reason: WhatsAppEmbeddedSignupCancelReason) => void;
  onError: (message: string) => void;
};

export function WhatsAppEmbeddedSignupButton({
  appId,
  configId,
  sdkVersion,
  disabled,
  className,
  connectLabel,
  loadingLabel,
  onComplete,
  onCancel,
  onError,
}: WhatsAppEmbeddedSignupButtonProps) {
  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMetaSdk(appId, sdkVersion)
      .then(() => {
        if (!cancelled) setSdkReady(true);
      })
      .catch((error) => {
        if (!cancelled) onError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [appId, sdkVersion, onError]);

  function launch() {
    if (!sdkReady || disabled || connecting) return;
    setConnecting(true);

    startWhatsAppEmbeddedSignup(configId, {
      onComplete: (payload) => {
        setConnecting(false);
        onComplete(payload);
      },
      onCancel: (reason) => {
        setConnecting(false);
        onCancel(reason);
      },
    });
  }

  return (
    <Button
      type="button"
      disabled={disabled || !sdkReady || connecting}
      onClick={launch}
      className={cn(
        "h-10 rounded-[10px] text-[14px] font-medium text-white shadow-none",
        "bg-[#25D366] hover:bg-[#1EBE57]",
        className,
      )}
    >
      {connecting || !sdkReady ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={1.75} />
          {loadingLabel}
        </>
      ) : (
        connectLabel
      )}
    </Button>
  );
}

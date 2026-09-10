"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";

type GatewaySseEvent =
  | { type: "qr"; qr: string; expiresAt: string }
  | {
      type: "status";
      status: string;
      displayPhoneNumber?: string | null;
      verifiedName?: string | null;
    }
  | { type: "error"; message: string };

type WhatsAppQrPanelProps = {
  eventsUrl: string | null;
  connecting?: boolean;
  onConnected?: () => void;
  onError?: (message: string) => void;
};

export function WhatsAppQrPanel({
  eventsUrl,
  connecting,
  onConnected,
  onError,
}: WhatsAppQrPanelProps) {
  const t = useT();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "qr" | "waiting" | "connecting">("idle");
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!eventsUrl) {
      setQrDataUrl(null);
      setPhase("idle");
      return;
    }

    connectedRef.current = false;
    setPhase("waiting");
    const source = new EventSource(eventsUrl);

    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as GatewaySseEvent;
        if (event.type === "qr") {
          void QRCode.toDataURL(event.qr, { margin: 1, width: 220 }).then(setQrDataUrl);
          setPhase("qr");
        }
        if (event.type === "status") {
          if (event.status === "connecting") setPhase("connecting");
          if (event.status === "connected" && !connectedRef.current) {
            connectedRef.current = true;
            setQrDataUrl(null);
            onConnected?.();
          }
        }
        if (event.type === "error") {
          onError?.(event.message);
        }
      } catch {
        /* ignore malformed SSE payloads */
      }
    };

    source.onerror = () => {
      if (!connectedRef.current) {
        onError?.(t("connections.whatsappConnectFailed"));
      }
      source.close();
    };

    return () => source.close();
  }, [eventsUrl, onConnected, onError, t]);

  const waiting = phase === "waiting" || phase === "connecting" || connecting;

  return (
    <div className="space-y-3">
      <div className="rounded-[14px] border border-[#E6E8EC] bg-white px-4 py-6 text-center">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={t("connections.whatsappQrScanAlt")}
            className="mx-auto size-[220px] rounded-[10px] border border-[#E6E8EC] bg-white p-2"
          />
        ) : (
          <div className="mx-auto flex size-[220px] items-center justify-center rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA]">
            <p className="px-4 text-[13px] text-[#667085]">
              {waiting
                ? t("connections.whatsappWaitingForQr")
                : t("connections.whatsappQrPlaceholderBody")}
            </p>
          </div>
        )}
        <p className="mt-3 text-[14px] font-medium text-[#0A0C10]">
          {phase === "connecting"
            ? t("connections.whatsappWaitingConnection")
            : qrDataUrl
              ? t("connections.whatsappScanQr")
              : t("connections.whatsappQrPlaceholderTitle")}
        </p>
      </div>

      <p className="text-[12px] text-[#667085]">{t("connections.whatsappQrHint")}</p>
    </div>
  );
}

export type WhatsAppConnectButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onConnect: () => void;
};

export function WhatsAppConnectButton({
  disabled,
  loading,
  onConnect,
}: WhatsAppConnectButtonProps) {
  const t = useT();
  return (
    <Button
      type="button"
      disabled={disabled || loading}
      onClick={onConnect}
      className="h-10 rounded-[10px] bg-whatsapp px-4 text-[13px] font-medium text-white shadow-none hover:bg-whatsapp/90 disabled:bg-whatsapp/60"
    >
      {loading ? t("connections.whatsappConnecting") : t("connections.whatsappConnect")}
    </Button>
  );
}

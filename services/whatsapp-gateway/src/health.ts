export type GatewayHealth = {
  ok: true;
  service: "whatsapp-gateway";
  phase: 5;
  provider: "whatsapp_web";
  baileys: true;
  version: string;
  features: {
    reconnect: true;
    gracefulShutdown: true;
    outboundText: true;
    inboundText: true;
  };
};

export function readHealth(): GatewayHealth {
  return {
    ok: true,
    service: "whatsapp-gateway",
    phase: 5,
    provider: "whatsapp_web",
    baileys: true,
    version: "7.0.0-rc14",
    features: {
      reconnect: true,
      gracefulShutdown: true,
      outboundText: true,
      inboundText: true,
    },
  };
}

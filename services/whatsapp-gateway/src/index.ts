import { createServer, type Server } from "node:http";

import { loadGatewayConfig } from "./config.js";
import { getCachedBaileysVersion } from "./baileys/version-cache.js";
import { registerGracefulShutdown } from "./graceful-shutdown.js";
import { readHealth } from "./health.js";
import { handleMessageRoutes } from "./routes/messages.js";
import { handleSessionRoutes } from "./routes/sessions.js";
import { SessionManager } from "./session-manager.js";

const DEFAULT_PORT = 8787;

export { readHealth };
export type { GatewayHealth } from "./health.js";

export type GatewayServer = {
  server: Server;
  manager: SessionManager;
};

export function createGatewayServer(
  config = loadGatewayConfig(),
  manager = new SessionManager(config),
): GatewayServer {
  void manager.restoreAllOnBoot().catch((error) => {
    console.error("[whatsapp-gateway] boot restore failed", error);
  });
  void getCachedBaileysVersion().catch((error) => {
    console.warn("[whatsapp-gateway] baileys version prefetch failed", error);
  });

  const server = createServer(async (req, res) => {
    const pathname = (req.url ?? "/").split("?")[0] ?? "/";

    if (req.method === "GET" && pathname === "/health") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(readHealth()));
      return;
    }

    const handledSession = await handleSessionRoutes(config, manager, req, res, pathname);
    if (handledSession) return;

    const handledMessage = await handleMessageRoutes(config, manager, req, res, pathname);
    if (handledMessage) return;

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });

  return { server, manager };
}

export function startGateway(port = DEFAULT_PORT): GatewayServer {
  const config = loadGatewayConfig();
  const gateway = createGatewayServer(config);
  registerGracefulShutdown(gateway.server, gateway.manager);
  gateway.server.listen(port, "0.0.0.0", () => {
    console.info(`[whatsapp-gateway] listening on 0.0.0.0:${port}`);
    console.info(`[whatsapp-gateway] phase 5 — inbound messaging`);
  });
  return gateway;
}

export { SessionManager };

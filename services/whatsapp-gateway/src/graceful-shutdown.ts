import type { Server } from "node:http";

import type { SessionManager } from "./session-manager.js";

export function registerGracefulShutdown(server: Server, manager: SessionManager): void {
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(`[whatsapp-gateway] ${signal} — graceful shutdown (sessions preserved)`);

    try {
      await manager.shutdownAll();
    } catch (error) {
      console.error("[whatsapp-gateway] shutdown error", error);
    }

    server.close(() => {
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

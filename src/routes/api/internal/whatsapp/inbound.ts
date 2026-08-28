import { createFileRoute } from "@tanstack/react-router";

import { verifyInboundRequest } from "@/lib/whatsapp/inbound/hmac.server";
import { ingestInboundMessage } from "@/lib/whatsapp/inbound/ingest-inbound.server";
import type { NormalizedInboundMessage } from "@/lib/whatsapp/inbound/types";

export const Route = createFileRoute("/api/internal/whatsapp/inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          verifyInboundRequest({
            rawBody,
            timestampHeader: request.headers.get("x-elevate-timestamp"),
            signatureHeader: request.headers.get("x-elevate-signature"),
          });

          const payload = JSON.parse(rawBody) as NormalizedInboundMessage;
          const result = await ingestInboundMessage(payload);

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "bad_request";
          const status =
            message.startsWith("inbound_auth") || message === "connection_not_found" ? 403 : 400;
          return new Response(JSON.stringify({ error: message }), {
            status,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});

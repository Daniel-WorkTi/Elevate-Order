import { createFileRoute } from "@tanstack/react-router";

import { handlePublicOrdersWebhook } from "@/lib/integrations/dropi/handle-public-orders-webhook";

function webhookProbe() {
  return new Response(JSON.stringify({ ok: true, service: "elevate-orders-webhook" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/webhooks/orders")({
  server: {
    handlers: {
      GET: async () => webhookProbe(),
      HEAD: async () => new Response(null, { status: 200 }),
      POST: async ({ request }) => handlePublicOrdersWebhook(request),
    },
  },
});

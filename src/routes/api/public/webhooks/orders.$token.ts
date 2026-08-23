import { createFileRoute } from "@tanstack/react-router";

import { handlePublicOrdersWebhook } from "@/lib/integrations/dropi/handle-public-orders-webhook";

export const Route = createFileRoute("/api/public/webhooks/orders/$token")({
  server: {
    handlers: {
      POST: async ({ request }) => handlePublicOrdersWebhook(request),
    },
  },
});

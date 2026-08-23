-- Per-workspace webhook tokens (each Dropi/Dropea merchant pastes their own URL).
-- Access only via service_role (server). No client/anon/authenticated access.
CREATE TABLE public.workspace_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  supply text NOT NULL CHECK (supply IN ('dropi', 'dropea')),
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, supply)
);

CREATE INDEX idx_workspace_webhook_endpoints_token
  ON public.workspace_webhook_endpoints (token);

ALTER TABLE public.workspace_webhook_endpoints ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.workspace_webhook_endpoints FROM PUBLIC;
REVOKE ALL ON public.workspace_webhook_endpoints FROM anon;
REVOKE ALL ON public.workspace_webhook_endpoints FROM authenticated;
GRANT ALL ON public.workspace_webhook_endpoints TO service_role;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS workspace_id text;

ALTER TABLE public.order_events
  ADD COLUMN IF NOT EXISTS workspace_id text;

CREATE INDEX IF NOT EXISTS idx_orders_workspace_id ON public.orders (workspace_id);
CREATE INDEX IF NOT EXISTS idx_order_events_workspace_id ON public.order_events (workspace_id);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id bigint NOT NULL UNIQUE,
  shopify_order_id bigint,
  status_id integer,
  status_name text,
  details text,
  tracking_code text,
  tracking_url text,
  shipping_company text,
  total numeric(12,2),
  source text NOT NULL DEFAULT 'Dropi Pro',
  last_event_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view orders"
  ON public.orders FOR SELECT TO authenticated USING (true);

CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id bigint NOT NULL,
  event_date timestamptz NOT NULL,
  status_id integer,
  status_name text,
  details text,
  tracking_code text,
  tracking_url text,
  shopify_order_id bigint,
  shipping_company text,
  total numeric(12,2),
  source text NOT NULL DEFAULT 'Dropi Pro',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, event_date, status_id)
);

GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view order events"
  ON public.order_events FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_order_events_order_id ON public.order_events (order_id);
CREATE INDEX idx_orders_status_id ON public.orders (status_id);
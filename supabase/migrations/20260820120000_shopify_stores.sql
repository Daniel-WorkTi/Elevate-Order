-- Shopify OAuth installs. Access tokens are service_role only — never exposed to anon/authenticated clients.
CREATE TABLE public.shopify_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_domain text NOT NULL,
  access_token text NOT NULL,
  scope text,
  installed_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  uninstalled_at timestamptz,
  UNIQUE (user_id, shop_domain)
);

CREATE INDEX idx_shopify_stores_shop_domain ON public.shopify_stores (shop_domain);
CREATE INDEX idx_shopify_stores_user_id ON public.shopify_stores (user_id);

ALTER TABLE public.shopify_stores ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.shopify_stores FROM PUBLIC;
REVOKE ALL ON public.shopify_stores FROM anon;
REVOKE ALL ON public.shopify_stores FROM authenticated;
GRANT ALL ON public.shopify_stores TO service_role;

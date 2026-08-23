-- Bind a Shopify OAuth install to the operator workspace so store orders
-- appear in Inbox / Pedidos (those queries are scoped by workspace_id).
ALTER TABLE public.shopify_stores
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

CREATE INDEX IF NOT EXISTS idx_shopify_stores_workspace_id
  ON public.shopify_stores (workspace_id);

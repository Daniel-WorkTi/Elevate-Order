-- ============================================================
-- Launch hardening: future ownership enforcement
-- Preserves legacy beta rows (NULL workspace_id / owner_user_id).
--
-- Uses CHECK ... NOT VALID so existing violating rows remain.
-- New INSERT/UPDATE rows must satisfy the check.
--
-- DO NOT run VALIDATE CONSTRAINT until legacy reconciliation.
-- ============================================================

BEGIN;

-- Orders: no NEW null workspace_id
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_workspace_id_required_future;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_workspace_id_required_future
  CHECK (workspace_id IS NOT NULL) NOT VALID;

COMMENT ON CONSTRAINT orders_workspace_id_required_future ON public.orders IS
  'Launch hardening: reject NEW null workspace_id. Legacy beta NULLs preserved until explicit reconciliation.';

-- Order events: no NEW null workspace_id
ALTER TABLE public.order_events
  DROP CONSTRAINT IF EXISTS order_events_workspace_id_required_future;

ALTER TABLE public.order_events
  ADD CONSTRAINT order_events_workspace_id_required_future
  CHECK (workspace_id IS NOT NULL) NOT VALID;

COMMENT ON CONSTRAINT order_events_workspace_id_required_future ON public.order_events IS
  'Launch hardening: reject NEW null workspace_id. Legacy beta NULLs preserved until explicit reconciliation.';

-- Shopify stores: no NEW null workspace_id
ALTER TABLE public.shopify_stores
  DROP CONSTRAINT IF EXISTS shopify_stores_workspace_id_required_future;

ALTER TABLE public.shopify_stores
  ADD CONSTRAINT shopify_stores_workspace_id_required_future
  CHECK (workspace_id IS NOT NULL) NOT VALID;

COMMENT ON CONSTRAINT shopify_stores_workspace_id_required_future ON public.shopify_stores IS
  'Launch hardening: reject NEW null workspace_id. Legacy NULLs preserved until explicit reconciliation.';

-- Workspaces: no NEW customer workspace without owner
-- (legacy ownerless beta workspaces remain until explicit reconciliation)
ALTER TABLE public.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_owner_user_id_required_future;

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_owner_user_id_required_future
  CHECK (owner_user_id IS NOT NULL) NOT VALID;

COMMENT ON CONSTRAINT workspaces_owner_user_id_required_future ON public.workspaces IS
  'Launch hardening: reject NEW ownerless workspaces. Legacy beta ownerless rows preserved until explicit reconciliation.';

COMMIT;

-- COD confirmation panel — workspace keywords + order reply tracking
BEGIN;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS whatsapp_confirm_keywords text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS whatsapp_reject_keywords text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.workspaces.whatsapp_confirm_keywords IS
  'Normalized exact-match phrases that classify inbound WhatsApp as COD confirm intent.';

COMMENT ON COLUMN public.workspaces.whatsapp_reject_keywords IS
  'Normalized exact-match phrases that classify inbound WhatsApp as COD reject intent.';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cod_reply_intent text
    CHECK (cod_reply_intent IS NULL OR cod_reply_intent IN ('confirm', 'reject', 'needs_operator')),
  ADD COLUMN IF NOT EXISTS cod_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS cod_reply_text text,
  ADD COLUMN IF NOT EXISTS cod_request_sent_at timestamptz;

COMMENT ON COLUMN public.orders.cod_reply_intent IS
  'Latest customer COD reply classification from WhatsApp (Elevate-side, not Dropi accept).';

COMMENT ON COLUMN public.orders.cod_reply_text IS
  'Raw customer reply text that produced cod_reply_intent.';

COMMENT ON COLUMN public.orders.cod_request_sent_at IS
  'First WhatsApp confirmation/outbound message sent for this order.';

CREATE INDEX IF NOT EXISTS idx_orders_cod_reply_intent
  ON public.orders (workspace_id, cod_reply_intent)
  WHERE cod_reply_intent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_cod_request_sent
  ON public.orders (workspace_id, cod_request_sent_at DESC)
  WHERE cod_request_sent_at IS NOT NULL;

COMMIT;

-- ============================================================
-- ELEVATE ORDERS
-- PHASE 1 — WHATSAPP DATABASE FOUNDATION (multi-tenant)
-- 2026-08-27
--
-- Scope: schema + RLS only. No Meta API, webhooks, or UI.
-- Secrets: whatsapp_connection_secrets (service_role only).
-- Token material deferred to Phase 3 (no encryption in this phase).
-- ============================================================

BEGIN;

-- ============================================================
-- 0) SHARED updated_at helper (whatsapp tables)
-- ============================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.touch_updated_at() IS
  'Generic BEFORE UPDATE trigger: sets updated_at = now(). Used by WhatsApp tables.';


-- ============================================================
-- 0.1) ORDERS — composite FK target (must exist BEFORE WhatsApp FKs)
-- PostgreSQL requires a non-partial UNIQUE index for composite FK refs.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS orders_id_workspace_uidx
  ON public.orders (id, workspace_id);


-- ============================================================
-- 1) WHATSAPP CONNECTIONS (non-sensitive metadata)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL
    REFERENCES public.workspaces (id)
    ON DELETE RESTRICT,

  meta_business_id text,
  waba_id text NOT NULL,
  phone_number_id text NOT NULL,
  display_phone_number text,
  verified_name text,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'connected', 'disconnected', 'error')),

  connected_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT whatsapp_connections_phone_e164_display_chk
    CHECK (
      display_phone_number IS NULL
      OR display_phone_number ~ '^\+[0-9]{6,15}$'
    )
);

COMMENT ON TABLE public.whatsapp_connections IS
  'Workspace-scoped WhatsApp Business connection metadata. No tokens here — see whatsapp_connection_secrets.';

COMMENT ON COLUMN public.whatsapp_connections.status IS
  'pending | connected | disconnected | error';

-- Composite key for cross-tenant FK enforcement (connection_id + workspace_id).
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_connections_id_workspace_uidx
  ON public.whatsapp_connections (id, workspace_id);

-- One active connection per workspace; one active Meta phone globally.
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_connections_one_connected_per_workspace_uidx
  ON public.whatsapp_connections (workspace_id)
  WHERE status = 'connected';

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_connections_phone_active_uidx
  ON public.whatsapp_connections (phone_number_id)
  WHERE status IN ('pending', 'connected');

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_workspace_id
  ON public.whatsapp_connections (workspace_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_phone_number_id
  ON public.whatsapp_connections (phone_number_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_waba_id
  ON public.whatsapp_connections (waba_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status
  ON public.whatsapp_connections (status);

DROP TRIGGER IF EXISTS trg_whatsapp_connections_updated_at ON public.whatsapp_connections;

CREATE TRIGGER trg_whatsapp_connections_updated_at
BEFORE UPDATE ON public.whatsapp_connections
FOR EACH ROW
EXECUTE PROCEDURE public.touch_updated_at();


-- ============================================================
-- 2) WHATSAPP CONNECTION SECRETS (service_role only)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_connection_secrets (
  connection_id uuid PRIMARY KEY
    REFERENCES public.whatsapp_connections (id)
    ON DELETE RESTRICT,

  -- Phase 3: store encrypted token material only. No plaintext access_token column.
  token_ciphertext text,
  token_expires_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.whatsapp_connection_secrets IS
  'Server-only secrets for WhatsApp connections. token_ciphertext populated in Phase 3 with proper encryption.';

COMMENT ON COLUMN public.whatsapp_connection_secrets.token_ciphertext IS
  'Reserved for Phase 3 encrypted token storage. NULL until Embedded Signup / token rotation.';

DROP TRIGGER IF EXISTS trg_whatsapp_connection_secrets_updated_at
  ON public.whatsapp_connection_secrets;

CREATE TRIGGER trg_whatsapp_connection_secrets_updated_at
BEFORE UPDATE ON public.whatsapp_connection_secrets
FOR EACH ROW
EXECUTE PROCEDURE public.touch_updated_at();


-- ============================================================
-- 3) WHATSAPP CONVERSATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL
    REFERENCES public.workspaces (id)
    ON DELETE RESTRICT,

  connection_id uuid NOT NULL,
  CONSTRAINT whatsapp_conversations_connection_workspace_fkey
    FOREIGN KEY (connection_id, workspace_id)
    REFERENCES public.whatsapp_connections (id, workspace_id)
    ON DELETE RESTRICT,

  order_id uuid,
  CONSTRAINT whatsapp_conversations_order_workspace_fkey
    FOREIGN KEY (order_id, workspace_id)
    REFERENCES public.orders (id, workspace_id)
    ON DELETE SET NULL,

  customer_phone_e164 text NOT NULL
    CHECK (customer_phone_e164 ~ '^\+[0-9]{6,15}$'),

  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),

  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.whatsapp_conversations IS
  'Minimal conversation thread per customer phone within a workspace connection.';

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_conversations_id_workspace_uidx
  ON public.whatsapp_conversations (id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_workspace_id
  ON public.whatsapp_conversations (workspace_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_connection_id
  ON public.whatsapp_conversations (connection_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_order_id
  ON public.whatsapp_conversations (order_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_customer_phone
  ON public.whatsapp_conversations (customer_phone_e164);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_workspace_customer
  ON public.whatsapp_conversations (workspace_id, customer_phone_e164);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message_at
  ON public.whatsapp_conversations (last_message_at);

DROP TRIGGER IF EXISTS trg_whatsapp_conversations_updated_at
  ON public.whatsapp_conversations;

CREATE TRIGGER trg_whatsapp_conversations_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW
EXECUTE PROCEDURE public.touch_updated_at();


-- ============================================================
-- 4) WHATSAPP MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL
    REFERENCES public.workspaces (id)
    ON DELETE RESTRICT,

  connection_id uuid NOT NULL,
  CONSTRAINT whatsapp_messages_connection_workspace_fkey
    FOREIGN KEY (connection_id, workspace_id)
    REFERENCES public.whatsapp_connections (id, workspace_id)
    ON DELETE RESTRICT,

  conversation_id uuid,
  CONSTRAINT whatsapp_messages_conversation_workspace_fkey
    FOREIGN KEY (conversation_id, workspace_id)
    REFERENCES public.whatsapp_conversations (id, workspace_id)
    ON DELETE RESTRICT,

  order_id uuid,
  CONSTRAINT whatsapp_messages_order_workspace_fkey
    FOREIGN KEY (order_id, workspace_id)
    REFERENCES public.orders (id, workspace_id)
    ON DELETE SET NULL,

  whatsapp_message_id text,
  direction text NOT NULL
    CHECK (direction IN ('inbound', 'outbound')),
  message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN (
      'text', 'template', 'interactive', 'image',
      'document', 'audio', 'video', 'unknown'
    )),
  template_name text,
  recipient_phone_e164 text
    CHECK (
      recipient_phone_e164 IS NULL
      OR recipient_phone_e164 ~ '^\+[0-9]{6,15}$'
    ),
  sender_phone_e164 text
    CHECK (
      sender_phone_e164 IS NULL
      OR sender_phone_e164 ~ '^\+[0-9]{6,15}$'
    ),
  message_body text,

  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN (
      'queued', 'sent', 'delivered', 'read', 'failed', 'received'
    )),

  meta_error_code text,
  meta_error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.whatsapp_messages IS
  'WhatsApp message log. Status timestamps updated by future webhooks (Phase 4+).';

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_whatsapp_message_id_uidx
  ON public.whatsapp_messages (whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_workspace_id
  ON public.whatsapp_messages (workspace_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_connection_id
  ON public.whatsapp_messages (connection_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id
  ON public.whatsapp_messages (conversation_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_order_id
  ON public.whatsapp_messages (order_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at
  ON public.whatsapp_messages (created_at);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status
  ON public.whatsapp_messages (status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_created
  ON public.whatsapp_messages (conversation_id, created_at);

DROP TRIGGER IF EXISTS trg_whatsapp_messages_updated_at ON public.whatsapp_messages;

CREATE TRIGGER trg_whatsapp_messages_updated_at
BEFORE UPDATE ON public.whatsapp_messages
FOR EACH ROW
EXECUTE PROCEDURE public.touch_updated_at();


-- ============================================================
-- 6) RLS — CONNECTIONS (authenticated: SELECT own only)
-- ============================================================

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.whatsapp_connections FROM PUBLIC;
REVOKE ALL ON public.whatsapp_connections FROM anon;

GRANT SELECT ON public.whatsapp_connections TO authenticated;
GRANT ALL ON public.whatsapp_connections TO service_role;

DROP POLICY IF EXISTS whatsapp_connections_select_own ON public.whatsapp_connections;

CREATE POLICY whatsapp_connections_select_own
  ON public.whatsapp_connections
  FOR SELECT
  TO authenticated
  USING (
    public.user_owns_workspace(workspace_id)
  );


-- ============================================================
-- 7) RLS — SECRETS (service_role only)
-- ============================================================

ALTER TABLE public.whatsapp_connection_secrets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.whatsapp_connection_secrets FROM PUBLIC;
REVOKE ALL ON public.whatsapp_connection_secrets FROM anon;
REVOKE ALL ON public.whatsapp_connection_secrets FROM authenticated;

GRANT ALL ON public.whatsapp_connection_secrets TO service_role;

-- No policies for authenticated/anon → implicit deny.


-- ============================================================
-- 8) RLS — CONVERSATIONS (authenticated: SELECT own only)
-- ============================================================

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.whatsapp_conversations FROM PUBLIC;
REVOKE ALL ON public.whatsapp_conversations FROM anon;

GRANT SELECT ON public.whatsapp_conversations TO authenticated;
GRANT ALL ON public.whatsapp_conversations TO service_role;

DROP POLICY IF EXISTS whatsapp_conversations_select_own ON public.whatsapp_conversations;

CREATE POLICY whatsapp_conversations_select_own
  ON public.whatsapp_conversations
  FOR SELECT
  TO authenticated
  USING (
    public.user_owns_workspace(workspace_id)
  );


-- ============================================================
-- 9) RLS — MESSAGES (authenticated: SELECT own only)
-- ============================================================

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.whatsapp_messages FROM PUBLIC;
REVOKE ALL ON public.whatsapp_messages FROM anon;

GRANT SELECT ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;

DROP POLICY IF EXISTS whatsapp_messages_select_own ON public.whatsapp_messages;

CREATE POLICY whatsapp_messages_select_own
  ON public.whatsapp_messages
  FOR SELECT
  TO authenticated
  USING (
    public.user_owns_workspace(workspace_id)
  );


COMMIT;

-- ============================================================
-- ELEVATE ORDERS
-- WHATSAPP WEB PROVIDER — schema evolution
-- 2026-08-28
--
-- NOT applied until explicitly approved + deployed.
-- ============================================================

BEGIN;

-- ============================================================
-- 1) whatsapp_connections — provider (safe backfill) + statuses
-- ============================================================

-- 1a) Add nullable first — no default yet (avoids misclassifying legacy rows).
ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS provider text;

COMMENT ON COLUMN public.whatsapp_connections.provider IS
  'Transport provider: whatsapp_web (active) | meta_cloud (legacy Meta Embedded Signup).';

-- 1b) Classify ALL pre-migration rows as meta_cloud.
--
-- Evidence (codebase audit, not heuristic guess):
--   - Table created in 20260827200000_whatsapp_foundation.sql for Meta Cloud API only.
--   - Sole app writer: persist-connection.server.ts (Embedded Signup / Graph API).
--   - Pending rows: waba_id / phone_number_id = 'pending:{connection_uuid}'.
--   - Connected rows: Graph numeric phone_number_id + whatsapp_connection_secrets row.
--   - No whatsapp_web code path exists before this migration.
UPDATE public.whatsapp_connections
SET provider = 'meta_cloud'
WHERE provider IS NULL;

-- Fail closed if any row could not be classified.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.whatsapp_connections WHERE provider IS NULL) THEN
    RAISE EXCEPTION 'whatsapp_connections: unclassified rows remain after meta_cloud backfill';
  END IF;
END $$;

-- 1c) Now safe to set default for new rows + NOT NULL + CHECK.
ALTER TABLE public.whatsapp_connections
  ALTER COLUMN provider SET DEFAULT 'whatsapp_web';

ALTER TABLE public.whatsapp_connections
  ALTER COLUMN provider SET NOT NULL;

ALTER TABLE public.whatsapp_connections
  DROP CONSTRAINT IF EXISTS whatsapp_connections_provider_chk;

ALTER TABLE public.whatsapp_connections
  ADD CONSTRAINT whatsapp_connections_provider_chk
  CHECK (provider IN ('whatsapp_web', 'meta_cloud'));

-- Migrate legacy status before replacing CHECK.
UPDATE public.whatsapp_connections
SET status = 'initializing'
WHERE status = 'pending';

ALTER TABLE public.whatsapp_connections
  ALTER COLUMN waba_id DROP NOT NULL;

ALTER TABLE public.whatsapp_connections
  ALTER COLUMN phone_number_id DROP NOT NULL;

ALTER TABLE public.whatsapp_connections
  DROP CONSTRAINT IF EXISTS whatsapp_connections_meta_cloud_ids_chk;

ALTER TABLE public.whatsapp_connections
  ADD CONSTRAINT whatsapp_connections_meta_cloud_ids_chk
  CHECK (
    provider <> 'meta_cloud'
    OR (waba_id IS NOT NULL AND phone_number_id IS NOT NULL)
  );

ALTER TABLE public.whatsapp_connections
  DROP CONSTRAINT IF EXISTS whatsapp_connections_status_check;

ALTER TABLE public.whatsapp_connections
  ADD CONSTRAINT whatsapp_connections_status_check
  CHECK (status IN (
    'disconnected',
    'initializing',
    'qr_ready',
    'connecting',
    'connected',
    'reconnecting',
    'error'
  ));

COMMENT ON COLUMN public.whatsapp_connections.status IS
  'disconnected | initializing | qr_ready | connecting | connected | reconnecting | error';

-- Replace Meta-centric partial unique indexes with provider-aware indexes.
DROP INDEX IF EXISTS public.whatsapp_connections_one_connected_per_workspace_uidx;
CREATE UNIQUE INDEX whatsapp_connections_one_connected_per_workspace_uidx
  ON public.whatsapp_connections (workspace_id)
  WHERE status = 'connected';

DROP INDEX IF EXISTS public.whatsapp_connections_phone_active_uidx;

CREATE UNIQUE INDEX whatsapp_connections_meta_phone_active_uidx
  ON public.whatsapp_connections (phone_number_id)
  WHERE provider = 'meta_cloud'
    AND phone_number_id IS NOT NULL
    AND status IN ('initializing', 'qr_ready', 'connecting', 'connected', 'reconnecting');

-- Lookup only — NO global unique on display_phone_number for whatsapp_web.
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_web_display_phone_lookup
  ON public.whatsapp_connections (display_phone_number)
  WHERE provider = 'whatsapp_web'
    AND display_phone_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_provider
  ON public.whatsapp_connections (provider);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_workspace_provider
  ON public.whatsapp_connections (workspace_id, provider);


-- ============================================================
-- 2) whatsapp_sessions — CASCADE on connection delete
-- ============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id uuid NOT NULL
    REFERENCES public.workspaces (id)
    ON DELETE RESTRICT,

  connection_id uuid NOT NULL
    REFERENCES public.whatsapp_connections (id)
    ON DELETE CASCADE,

  provider text NOT NULL DEFAULT 'whatsapp_web'
    CHECK (provider IN ('whatsapp_web', 'meta_cloud')),

  encrypted_creds text NOT NULL,
  session_version integer NOT NULL DEFAULT 1,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT whatsapp_sessions_connection_workspace_fkey
    FOREIGN KEY (connection_id, workspace_id)
    REFERENCES public.whatsapp_connections (id, workspace_id)
    ON DELETE CASCADE
);

COMMENT ON TABLE public.whatsapp_sessions IS
  'Encrypted Baileys credential state. One row per connection_id. Gateway-only access.';

COMMENT ON COLUMN public.whatsapp_sessions.encrypted_creds IS
  'AES-256-GCM encrypted Baileys creds JSON. Decrypted only by whatsapp-gateway.';

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_sessions_connection_uidx
  ON public.whatsapp_sessions (connection_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_workspace_id
  ON public.whatsapp_sessions (workspace_id);

DROP TRIGGER IF EXISTS trg_whatsapp_sessions_updated_at ON public.whatsapp_sessions;
CREATE TRIGGER trg_whatsapp_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW
EXECUTE PROCEDURE public.touch_updated_at();


-- ============================================================
-- 3) whatsapp_session_keys — CASCADE on session delete
-- ============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_session_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id uuid NOT NULL
    REFERENCES public.whatsapp_sessions (id)
    ON DELETE CASCADE,

  key_type text NOT NULL,
  key_id text NOT NULL,
  encrypted_value text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT whatsapp_session_keys_unique_key
    UNIQUE (session_id, key_type, key_id)
);

COMMENT ON TABLE public.whatsapp_session_keys IS
  'Incremental encrypted Baileys auth keys. Upsert-on-change via gateway auth-state adapter.';

CREATE INDEX IF NOT EXISTS idx_whatsapp_session_keys_session_id
  ON public.whatsapp_session_keys (session_id);

DROP TRIGGER IF EXISTS trg_whatsapp_session_keys_updated_at ON public.whatsapp_session_keys;
CREATE TRIGGER trg_whatsapp_session_keys_updated_at
BEFORE UPDATE ON public.whatsapp_session_keys
FOR EACH ROW
EXECUTE PROCEDURE public.touch_updated_at();


-- ============================================================
-- 4) whatsapp_messages — idempotency per connection
-- ============================================================

COMMENT ON COLUMN public.whatsapp_messages.whatsapp_message_id IS
  'Provider external message id (Baileys id / Meta wamid). Idempotency key with connection_id.';

DROP INDEX IF EXISTS public.whatsapp_messages_whatsapp_message_id_uidx;

CREATE UNIQUE INDEX whatsapp_messages_connection_external_id_uidx
  ON public.whatsapp_messages (connection_id, whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;


-- ============================================================
-- 5) RLS — sessions + keys (service_role ONLY)
-- ============================================================

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_session_keys ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.whatsapp_sessions FROM PUBLIC;
REVOKE ALL ON public.whatsapp_sessions FROM anon;
REVOKE ALL ON public.whatsapp_sessions FROM authenticated;
GRANT ALL ON public.whatsapp_sessions TO service_role;

REVOKE ALL ON public.whatsapp_session_keys FROM PUBLIC;
REVOKE ALL ON public.whatsapp_session_keys FROM anon;
REVOKE ALL ON public.whatsapp_session_keys FROM authenticated;
GRANT ALL ON public.whatsapp_session_keys TO service_role;


-- ============================================================
-- 6) Realtime — connection status only (QR never persisted)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_connections;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

COMMENT ON TABLE public.whatsapp_connections IS
  'Workspace WhatsApp connection metadata. Status via Realtime. QR ephemeral (SSE only).';

COMMENT ON TABLE public.whatsapp_connection_secrets IS
  'meta_cloud OAuth tokens. whatsapp_web auth state: whatsapp_sessions + whatsapp_session_keys.';

COMMIT;

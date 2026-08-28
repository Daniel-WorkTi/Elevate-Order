-- Phase 3 — connection stability metadata (additive, safe)
BEGIN;

ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error_code integer;

COMMENT ON COLUMN public.whatsapp_connections.last_seen_at IS
  'Last gateway heartbeat while session is alive (connected/reconnecting).';

COMMENT ON COLUMN public.whatsapp_connections.last_error_code IS
  'Baileys disconnect status code from the most recent close event.';

COMMIT;

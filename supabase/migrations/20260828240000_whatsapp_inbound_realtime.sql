-- Phase 5 supplement — enable Supabase Realtime for Inbox live updates
-- Requires 20260828230000_whatsapp_inbound_inbox.sql applied first.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

COMMENT ON TABLE public.whatsapp_conversations IS
  'Conversation threads per workspace connection + customer phone. Realtime for Inbox list/unread.';

COMMENT ON TABLE public.whatsapp_messages IS
  'WhatsApp message log (inbound + outbound). Realtime for Inbox thread updates.';

COMMIT;

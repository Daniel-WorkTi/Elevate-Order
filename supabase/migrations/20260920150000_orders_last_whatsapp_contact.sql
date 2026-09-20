-- Phase 3: persist Elevate WhatsApp contact time on orders (operational "messaged" truth).
alter table public.orders
  add column if not exists last_whatsapp_contact_at timestamptz;

comment on column public.orders.last_whatsapp_contact_at is
  'Set when Elevate successfully sends a WhatsApp message for this order. Never invent contact state from UI clicks alone.';

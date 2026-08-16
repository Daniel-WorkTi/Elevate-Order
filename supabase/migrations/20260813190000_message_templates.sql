-- Operational WhatsApp/message templates per supply (Dropi | Dropea).
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supply text NOT NULL CHECK (supply IN ('dropi', 'dropea')),
  kind text NOT NULL CHECK (
    kind IN (
      'confirmation',
      'follow_up',
      'address_problem',
      'delivery_attempt',
      'tracking_update',
      'incident',
      'cancelled'
    )
  ),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supply, kind)
);

CREATE INDEX idx_message_templates_supply ON public.message_templates (supply);

GRANT SELECT ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view message templates"
  ON public.message_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upsert message templates"
  ON public.message_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

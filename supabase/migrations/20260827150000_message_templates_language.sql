-- Multi-language WhatsApp templates (pt / en / es / …).
ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'pt';

UPDATE public.message_templates
SET language = 'pt'
WHERE language IS NULL OR language = '';

ALTER TABLE public.message_templates
  DROP CONSTRAINT IF EXISTS message_templates_kind_key;

ALTER TABLE public.message_templates
  DROP CONSTRAINT IF EXISTS message_templates_kind_language_key;

ALTER TABLE public.message_templates
  ADD CONSTRAINT message_templates_kind_language_key UNIQUE (kind, language);

ALTER TABLE public.message_templates
  DROP CONSTRAINT IF EXISTS message_templates_language_check;

ALTER TABLE public.message_templates
  ADD CONSTRAINT message_templates_language_check
  CHECK (language IN ('pt', 'en', 'es', 'pl', 'fr', 'it', 'de'));

CREATE INDEX IF NOT EXISTS idx_message_templates_language
  ON public.message_templates (language);

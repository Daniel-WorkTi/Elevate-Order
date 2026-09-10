-- Server-side encrypted credentials for supply integrations (Dropea API token + HMAC).
-- service_role only — never exposed to anon/authenticated clients.

CREATE TABLE IF NOT EXISTS public.workspace_provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider = 'dropea'),
  api_token_ciphertext text NOT NULL,
  hmac_secret_ciphertext text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_workspace_provider_credentials_workspace
  ON public.workspace_provider_credentials (workspace_id);

ALTER TABLE public.workspace_provider_credentials ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.workspace_provider_credentials FROM PUBLIC;
REVOKE ALL ON public.workspace_provider_credentials FROM anon;
REVOKE ALL ON public.workspace_provider_credentials FROM authenticated;
GRANT ALL ON public.workspace_provider_credentials TO service_role;

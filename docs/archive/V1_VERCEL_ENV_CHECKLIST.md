# ELEVATE V1 — Vercel ENV checklist

**Names only — never paste secret values into tickets or chat.**

| NAME | FEATURE | SERVER/CLIENT | REQUIRED | OPTIONAL | PRODUCTION REQUIRED | EFFECT IF MISSING |
| --- | --- | --- | --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Auth / Realtime | Client | Yes | | Yes | App cannot auth |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Auth | Client | Yes | | Yes | App cannot auth |
| `SUPABASE_URL` | Server + gateway | Server | Yes | | Yes | Webhooks/sync fail |
| `SUPABASE_PUBLISHABLE_KEY` | SSR auth | Server | Yes | | Yes | Session SSR fails |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin writes | Server | Yes | | Yes | Orders ingest/list fail |
| `PUBLIC_APP_URL` | Webhook URLs | Server | Strongly | | Yes | Wrong webhook URLs |
| `VERCEL_URL` / `VERCEL_PROJECT_PRODUCTION_URL` | URL fallback | Server | | Auto | Auto | Fallback only |
| `ELEVATE_WEBHOOK_TOKEN` | Webhook auth | Server | | Alt | If used | 401 on ingest |
| `WHATSAPP_PROVIDER` | Provider select | Server | | Default `whatsapp_web` | Recommended | Defaults to web |
| `WHATSAPP_GATEWAY_URL` | App → gateway | Server | For WA Web | | **Yes for prod WA** | Connect/send unavailable |
| `GATEWAY_INTERNAL_SECRET` | JWT/HMAC | Server+GW | For WA | | Yes for WA | Gateway auth fails |
| `WHATSAPP_INBOUND_HMAC_SECRET` | Inbound HMAC | Server | | Falls back to gateway secret | Recommended | Uses fallback |
| `WHATSAPP_SESSION_ENCRYPTION_KEY` | Session at rest | Gateway host | For WA | | On gateway host | Sessions fail |
| `WHATSAPP_TOKEN_ENCRYPTION_KEY` | Meta + **Dropea credential encrypt** | Server | For Dropea save / Meta | | Yes if Dropea connect | Cannot save Dropea secrets |
| `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` | Dropea encrypt | Server | | Prefers over WA key | Optional alias | Falls back |
| `ELEVATE_INBOUND_URL` | Gateway → app | Gateway host | For inbound | | On gateway host | Inbox inbound skipped |
| `WHATSAPP_GATEWAY_PORT` | Local gateway | Gateway | | Dev | N/A on Vercel web | |
| `SHOPIFY_API_KEY` | Shopify OAuth | Server | For OAuth install | | If OAuth used | Manual token path only |
| `SHOPIFY_API_SECRET` | Shopify OAuth | Server | For OAuth | | If OAuth used | OAuth broken |
| `SHOPIFY_APP_SCOPES` | OAuth scopes | Server | | | Optional | Default scopes |
| `VITE_DROPI_DASHBOARD_URL` | Abrir na Dropi | Client | | Default `app.dropi.co` | Optional | Default URL |
| Meta `META_*` vars | Legacy Meta Cloud | Server | | Legacy only | No for V1 WA Web | Meta UI inactive |

## Production notes

1. Vercel hosts the **web app only**. WhatsApp gateway must run on a separate always-on host with matching secrets and a public URL in `WHATSAPP_GATEWAY_URL`.
2. After deploy, confirm webhook URLs use the production `PUBLIC_APP_URL`.
3. Apply migration `20260910180000_workspace_provider_credentials.sql` before relying on Dropea server-side credentials.

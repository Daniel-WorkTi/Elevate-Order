# ELEVATE V1 — Environment Variable Audit

**Auditor:** SENTINEL  
**Commit:** `bcf0f56`  
**Date:** 2026-09-10  

**Security rule:** names only — no values printed.

---

## Matrix

| VARIABLE | USED BY | CLIENT/SERVER | REQUIRED/OPTIONAL | LOCAL (.env name present?) | VERCEL REQUIRED | FEATURE IMPACT | SECURITY NOTES |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser + SSR clients | Client | Required | Yes | Yes | Auth, realtime | Publishable URL OK in client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser + SSR | Client | Required | Yes | Yes | Auth | Not service role |
| `VITE_SUPABASE_PROJECT_ID` | Present in env file | Client | Optional | Yes | Optional | Tooling | |
| `SUPABASE_URL` | Server admin, gateway | Server | Required | Yes | Yes | Webhooks, sync, WA | |
| `SUPABASE_PUBLISHABLE_KEY` | Server/SSR | Server | Required | Yes | Yes | Auth middleware | |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client, webhook auth | Server | Required | Yes | Yes | All server writes | **Never expose to client** |
| `SUPABASE_PROJECT_ID` | Env file | Server | Optional | Yes | Optional | | |
| `PUBLIC_APP_URL` | Webhook URL builder, gateway inbound | Server | Strongly recommended | Yes | Yes (prod) | Correct webhook URLs | Wrong value → Dropi misconfigured |
| `VERCEL_PROJECT_PRODUCTION_URL` | Webhook URL fallback | Server | Optional | Process may inject on Vercel | Auto | URL fallback | |
| `VERCEL_URL` | Same | Server | Optional | Auto on Vercel | Auto | | |
| `ELEVATE_WEBHOOK_TOKEN` | Webhook auth | Server | Optional/alt | Yes | If using shared token | Ingest auth | Secret |
| `WHATSAPP_PROVIDER` | Provider context | Server | Optional (default web) | Yes | Recommended | Provider selection | |
| `WHATSAPP_GATEWAY_URL` | App → gateway | Server | Required for WA Web | Yes | **Yes for prod WA** | Connect/send | Must be reachable from Vercel |
| `WHATSAPP_GATEWAY_PORT` | Gateway listen | Gateway | Dev | Yes | N/A on Vercel web | Local gateway | |
| `GATEWAY_INTERNAL_SECRET` | JWT + inbound HMAC fallback | Server+Gateway | Required for WA | Yes | Yes | Auth app↔gateway | High sensitivity |
| `WHATSAPP_INBOUND_HMAC_SECRET` | Inbound HMAC preferred | Server | Optional (falls back) | **No** | Recommended | Inbound auth | Falls back to gateway secret |
| `WHATSAPP_SESSION_ENCRYPTION_KEY` | Gateway session crypto | Gateway | Required | Yes | On gateway host | Session at rest | High sensitivity |
| `ELEVATE_INBOUND_URL` | Gateway → app inbound | Gateway | Required for inbound | Yes | On gateway host | Inbox ingest | |
| `WHATSAPP_GATEWAY_CORS_ORIGINS` | Gateway CORS | Gateway | Optional | Unknown | Gateway host | Browser SSE | |
| `VITE_PUBLIC_APP_URL` | Gateway forward helper | Client-ish / gateway | Optional | No in .env list | Optional | | |
| `VITE_DROPI_DASHBOARD_URL` | Abrir na Dropi | Client | Optional | **No** | Optional | Defaults `app.dropi.co` | |
| `SHOPIFY_API_KEY` | OAuth | Server | Required for OAuth | **No** | Yes if Shopify OAuth | Install flow | |
| `SHOPIFY_API_SECRET` | OAuth + webhooks | Server | Required | **No** | Yes | Shopify | Secret |
| `SHOPIFY_APP_SCOPES` | OAuth | Server | Optional | No | Optional | Scopes | |
| `META_APP_ID` / `META_APP_SECRET` / `META_WHATSAPP_CONFIG_ID` / graph+sdk versions | Meta Cloud legacy | Server | Legacy only | Yes (several) | Only if re-enabling Meta | Legacy provider | Not active UI |
| `WHATSAPP_TOKEN_ENCRYPTION_KEY` | Meta token crypto | Server | Legacy | Yes | Legacy | Meta secrets | |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` / alt Meta config IDs | Meta aliases | Server | Legacy | No | Legacy | | |
| `META_REDIRECT_URI` | Meta | Server | Legacy | No | Legacy | | |
| `LOG_LEVEL` | Gateway logs | Gateway | Optional | — | Gateway | Observability | |
| `NODE_ENV` | Cookies secure flags | Server | Auto | Auto | Auto | | |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Gateway `dev.ts` sets `0` | Gateway | Dev hack | Set by code | Must **not** in prod | TLS verification disabled in gateway dev | **P0 if replicated in prod** |

---

## User-facing config / developer strings

| Message pattern | Where | Classification |
| --- | --- | --- |
| `Missing Supabase environment variable(s): …` | clients / middleware | CONFIG_ERROR + UX_PROBLEM if shown raw |
| `Server synchronization is not fully configured.` | Dropi/Dropea/Shopify dashboards | CONFIG_ERROR + UX_PROBLEM |
| `connections.whatsappNotConfigured` mentions `WHATSAPP_GATEWAY_URL` / `GATEWAY_INTERNAL_SECRET` | i18n | CONFIG_ERROR + UX_PROBLEM (env names in product copy) |
| `Connect Supabase in Lovable Cloud` | client errors | UX_PROBLEM for end operators |

---

## Local vs production notes

- Local `.env` has core Supabase + WhatsApp gateway secrets **by name**.  
- Local missing Shopify OAuth pair → Shopify install **CONFIG_ERROR** until set on Vercel/local.  
- Vercel hosts the **web** app only; gateway must be a separate always-on host with matching secrets and public URL.  
- Do not commit `.env`.

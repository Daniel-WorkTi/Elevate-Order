# ELEVATE — Current State

**Updated:** 2026-09-20 (Dropi onboarding final — configured_by_user + tenant webhook isolation)  
**Canon:** [PROJECT.md](../PROJECT.md) · [DESIGN.md](../DESIGN.md) · this file  
**External ops:** [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) · [LAUNCH_READINESS.md](./LAUNCH_READINESS.md)  
**Agents:** [AGENTS.md](../AGENTS.md)

---

## Product snapshot

- Nav: **Inbox · Orders · Templates · Profits · Connections**
- `/` = WhatsApp Inbox
- Orders / Profits = Supabase via server functions
- WhatsApp: **`whatsapp_web`** + Railway gateway
- Onboarding ↔ Connections share connection-domain truth (skipped ≠ connected)
- Onboarding steps: **Configuração → WhatsApp → Pronto** (no informational Pedidos step)
- Configuration: **3-up provider chooser** → single-provider setup with `variant="onboarding"` on shared panels (Connections keeps full UI)

---

## Onboarding architecture (corrected)

| Step | Content |
| --- | --- |
| **Configuração** | Chooser (Shopify \| Dropi Pro \| Dropea). Selecting one hides chooser and shows compact setup (`StoreConnectPanel` / `DropiSetupPanel` / `DropeaSetupPanel` with `variant="onboarding"`). Same OAuth/webhook/credential backends as Connections. One valid source → Continue to WhatsApp. |
| **WhatsApp** | Real `WhatsAppConnectPanel` / gateway QR |
| **Pronto** | Backend connection summaries; Enter ELEVATE |

### Onboarding vs Connections (presentation only)

| Surface | UI |
| --- | --- |
| **Chooser desktop** | ~1100px content; 3-up cards ~260px tall; left-aligned premium cards |
| **Setup desktop** | ~820px central surface; logo + title + guided panel |
| **Onboarding Shopify** | Domain + Continuar com Shopify (real OAuth); myshopify help; advanced token collapsed |
| **Onboarding Dropi** | Guided 01–03 + real unique webhook URL + checkbox → **configured_by_user** (not Connected) |
| **Onboarding Dropea** | Token API + HMAC only; friendly errors; no webhook docs |
| **Connections** | Full management (howto, sync, disconnect, webhook for Dropea, etc.) |

### Dropi status semantics

| Signal | Meaning |
| --- | --- |
| Checkbox / `configuredByUser` (local) | Operator says webhook was pasted+saved → onboarding may continue |
| Backend `configured` | Workspace webhook endpoint exists; no events yet → Connections shows **Configurado** |
| Backend `connected` | First valid inbound Dropi webhook for that workspace → **Conectado** (`lastSuccessfulEventAt` / events) |

Copying the URL alone never changes status. Invalid/unknown webhook tokens return **401** and write nothing.

### Dropi webhook tenant isolation (production)

- Table `workspace_webhook_endpoints`: `UNIQUE(token)`, `UNIQUE(workspace_id, supply)`
- Token: `elevate_wh_` + 24 cryptographically random bytes (hex) — no user/workspace id in URL
- Resolve: path `/api/public/webhooks/orders/$token` → lookup token → `workspace_id` + `supply`
- Writes stamp `workspace_id` from auth; cross-workspace `order_id` collisions are skipped

Legacy `?step=store|orders` → `configuration`. Skip = not configured, never Connected.

---

## Phase 3 — Production path readiness map

Classification is code + real dependencies (not unit-test green alone).

| Step | Status | Notes |
| --- | --- | --- |
| Auth signup/login + session | **CODE_READY_EXTERNAL_SETUP_REQUIRED** | Supabase Auth + redirect URLs on prod |
| Auth → onboarding gate | **READY** | New users → onboarding; completed/`grandfathered` → `/` via `getOnboardingGate` on `/auth/callback` |
| Returning user not trapped | **READY** | Completion cookie + age grandfather; callback no longer always forces onboarding |
| Shopify OAuth | **CODE_READY_EXTERNAL_SETUP_REQUIRED** | Partner redirect URI + API key/secret + `PUBLIC_APP_URL` |
| Shopify → `shopify_stores` + sync | **CODE_READY_EXTERNAL_SETUP_REQUIRED** | Post-install sync persists normalized Shopify orders (store platform — not Dropi/Dropea ops tabs) |
| Dropi webhook → orders | **CODE_READY_EXTERNAL_SETUP_REQUIRED** | External Dropi URL + `ELEVATE_WEBHOOK_TOKEN`; Connected only after workspace events |
| Dropi tenant isolation | **READY** | Opaque webhook token → workspace; prod `UNIQUE(workspace_id, order_id)` via `orders_workspace_order_id_uidx` |
| Shopify persist | **READY** | Persist/enrichment scoped by workspace; no cross-tenant store fallback |
| Dropea credentials + sync | **CODE_READY_EXTERNAL_SETUP_REQUIRED** | Save validates API key; encrypt at rest; workspace-scoped upsert |
| Migration workspace-scoped order identity | **APPLIED (prod)** | `orders_workspace_order_id_uidx` + `order_events_workspace_order_event_uidx`; global `orders_order_id_key` removed. 49 NULL-workspace orders deferred. |
| Future ownership CHECK NOT VALID | **APPLIED (prod)** | Probe-verified 2026-09-20: all 4 CHECKs reject new nulls; 49 null orders + 3 ownerless workspaces preserved. Do **not** VALIDATE yet. |
| Legacy beta data | **PRESERVE** | 3 ownerless workspaces + 49 null-workspace Shopify orders (pre-hardening). Never auto-assign/delete. |
| Canonical order pipeline | **READY** | Dropi/Dropea/Shopify normalizers → `orders` / `order_events` → server queries (no mock UI path) |
| Supply queue isolation (UI) | **READY** | `supplyMatchesSource` keeps Dropi vs Dropea tabs separate |
| Inbox / Orders UI | **READY** | Persisted rows only; empty/loading/error paths exist |
| Templates / message render | **READY** | Missing vars → empty or `[variável indisponível]` — never `undefined`/`{{raw}}` |
| Phone E.164 | **READY** | No invented country codes; ambiguous local → block send |
| WhatsApp gateway QR/session | **CODE_READY_EXTERNAL_SETUP_REQUIRED** | Railway URL + shared `GATEWAY_INTERNAL_SECRET` (both required for “configured”) |
| WhatsApp send → contact state | **READY** (code) | Successful send sets `orders.last_whatsapp_contact_at` → operational messaged |
| Migration `last_whatsapp_contact_at` on prod | **CODE_READY_EXTERNAL_SETUP_REQUIRED** | Must apply `20260920150000_orders_last_whatsapp_contact.sql` |

---

## Canonical pipeline (actual)

```
Dropi webhook  → webhook-auth → normalize → order_events + orders (workspace_id) → Inbox/Orders (source Dropi)
Dropea API     → encrypted creds → fetch → normalize (source Dropea) → same tables → Dropea tab only
Shopify OAuth  → token → REST orders → shopify-normalize → persist (source Shopify) → store sync / not ops supply tabs
```

Missing external fields stay `null` / unavailable UI — never fabricated tracking URLs.

---

## Production environment matrix

Values omitted. Deployed envs: **MANUAL VERIFICATION REQUIRED** (not inspected from this session).

| VARIABLE | SERVICE | PURPOSE | REQUIRED | PRODUCTION | PREVIEW | LOCAL |
| --- | --- | --- | --- | --- | --- | --- |
| `SUPABASE_URL` | Vercel / local | Server Supabase API | Yes | MANUAL | MANUAL | `.env` |
| `SUPABASE_PUBLISHABLE_KEY` | Vercel / local | Server anon/publishable | Yes | MANUAL | MANUAL | `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel / local | Server writes (never `VITE_*`) | Yes | MANUAL | MANUAL | `.env` |
| `VITE_SUPABASE_URL` | Vercel / local | Browser client | Yes | MANUAL | MANUAL | `.env` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vercel / local | Browser client | Yes | MANUAL | MANUAL | `.env` |
| `PUBLIC_APP_URL` | Vercel | Stable origin (OAuth/webhooks) | Yes (prod) | MANUAL | optional | optional |
| `SHOPIFY_API_KEY` | Vercel | OAuth client id | For Shopify | MANUAL | MANUAL | optional |
| `SHOPIFY_API_SECRET` | Vercel | OAuth secret | For Shopify | MANUAL | MANUAL | optional |
| `SHOPIFY_APP_SCOPES` | Vercel | Scope override | No | MANUAL | MANUAL | optional |
| `ELEVATE_WEBHOOK_TOKEN` | Vercel | Dropi/public webhook auth | For Dropi | MANUAL | MANUAL | optional |
| `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` | Vercel | Dropea credential crypto | For Dropea | MANUAL | MANUAL | optional |
| `WHATSAPP_TOKEN_ENCRYPTION_KEY` | Vercel | Fallback crypto key name | Alt | MANUAL | MANUAL | optional |
| `WHATSAPP_GATEWAY_URL` | Vercel | Railway gateway base URL | For WA | MANUAL | MANUAL | optional |
| `GATEWAY_INTERNAL_SECRET` | Vercel + Railway | JWT/HMAC between app ↔ gateway | For WA | MANUAL | MANUAL | optional |
| `WHATSAPP_PROVIDER` | Vercel | Default `whatsapp_web` | No | MANUAL | MANUAL | optional |
| Shopify Partner redirect URL | Shopify | `/auth/shopify/callback` | For Shopify | MANUAL | MANUAL | n/a |
| Dropi webhook target | Dropi Pro | Paste Elevate webhook URL | For Dropi | MANUAL | n/a | n/a |
| Dropea API key | Dropea | Operator credential | For Dropea | MANUAL | n/a | n/a |

---

## Phase 3 code fixes (this pass)

- Auth callback redirects via `getOnboardingGate` (completed users → `/`)
- WhatsApp successful send persists `last_whatsapp_contact_at`; Inbox/Orders map the column
- Phone normalization is strict E.164; `wa.me` strips non-digits
- Gateway “configured” requires URL **and** `GATEWAY_INTERNAL_SECRET`
- Dropea save validates API key before encrypt/persist
- Dropea sync + Dropi webhook share cross-workspace `order_id` collision guard
- Migration for `last_whatsapp_contact_at`

---

## P0 / P1 (remaining)

**P0 (block real E2E until external):** production env pairing + migrations + Shopify/Dropi/Dropea/WA operator setup — see [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).

**P1 (schema):** legacy `orders.workspace_id` / `order_events.workspace_id` NULL rows — inventory + reconcile before NOT NULL; do not auto-assign.

**P1 (onboarding cookie):** completion cookie is readable/forgeable client-side — acceptable for gate UX, not a security boundary.

---

## Validation (Dropi onboarding final + tenant webhook)

| Check | Result |
| --- | --- |
| `npm test` | **PASS** (217/217) |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |
| `npm run lint` | Pre-existing CRLF prettier noise — not mixed into this phase |

---

## Can a brand-new real user process a real order end-to-end today?

**YES, AFTER EXTERNAL SETUP** — code path is wired; production credentials, Partner/Dropi/Dropea setup, Railway gateway, and DB migrations must be applied and verified on the live stack.

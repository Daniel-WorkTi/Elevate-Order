# ELEVATE — Current State

**Updated:** 2026-09-20 (Onboarding provider setup — presentation variant)  
**Canon:** [PROJECT.md](../PROJECT.md) · [DESIGN.md](../DESIGN.md) · this file  
**External ops:** [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)  
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
| **Onboarding Shopify** | Domain + Continuar com Shopify (real OAuth); myshopify help; advanced token collapsed |
| **Onboarding Dropi** | 3 steps (Configurações → API → Webhooks); real webhook URL + copy; waiting until first event |
| **Onboarding Dropea** | Token API + HMAC only; friendly errors; no webhook docs |
| **Connections** | Full management (howto, sync, disconnect, webhook for Dropea, etc.) |

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
| Dropi tenant isolation | **PARTIAL** | Runtime collision guard blocks cross-workspace overwrite; schema still global `UNIQUE(order_id)` (P1 migrate to composite uniqueness) |
| Dropea credentials + sync | **CODE_READY_EXTERNAL_SETUP_REQUIRED** | Save validates API key; encrypt at rest; sync collision-guarded |
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

**P1 (schema):** global `UNIQUE(order_id)` — mitigated by collision skip, not fixed by composite unique `(workspace_id, order_id)`.

**P1 (onboarding cookie):** completion cookie is readable/forgeable client-side — acceptable for gate UX, not a security boundary.

---

## Validation (Phase 3 + onboarding setup simplify)

| Check | Result |
| --- | --- |
| `npm test` | **PASS** (206/206) |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |
| `npm run lint` | Pre-existing CRLF prettier noise — not mixed into this phase |

---

## Can a brand-new real user process a real order end-to-end today?

**YES, AFTER EXTERNAL SETUP** — code path is wired; production credentials, Partner/Dropi/Dropea setup, Railway gateway, and DB migrations must be applied and verified on the live stack.

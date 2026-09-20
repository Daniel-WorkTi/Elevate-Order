# ELEVATE V1 — Connection Audit

**Auditor:** SENTINEL  
**Commit:** `bcf0f56`  
**Date:** 2026-09-10

Green “Connected” badges are **not** treated as proof. Trace to backend.

---

## Dropi

| Stage | Classification | Evidence |
| --- | --- | --- |
| UI page `/connections/dropi` | IMPLEMENTED | `connections.dropi.tsx` + `DropiSetupPanel` |
| Webhook URL generation | IMPLEMENTED | `getWorkspaceWebhookUrl` / workspace endpoints |
| Copy webhook | IMPLEMENTED | Clipboard button |
| Connect button | **MOCK** | `use-dropi-connection-preference` → localStorage only |
| Disconnect | **MOCK** | Clears local flag |
| Credential/API key validation to Dropi | **NOT_IMPLEMENTED** | No Dropi API outbound accept (manual ops by design) |
| Event ingestion | IMPLEMENTED | `POST /api/public/webhooks/orders` (+ token route) |
| Auth on webhook | WORKING (runtime) | POST without key → **401** |
| Normalization | IMPLEMENTED | `dropi-webhook-normalize.ts` |
| DB persistence | IMPLEMENTED | `orders` + `order_events` |
| Connection status accuracy | **BROKEN / MOCK** | UI “linked” ≠ proof of webhook events |
| “Abrir na Dropi” | PARTIAL | `https://app.dropi.co/orders` (override `VITE_DROPI_DASHBOARD_URL`) — no per-order deep-link |
| Server readiness messaging | PARTIAL | May surface “Server synchronization is not fully configured.” (env names) |

**Data flow:** Dropi → webhook → normalize → Supabase → Orders (Dropi tab).  
Break risk: operator marks Connected without ever registering webhook at Dropi.

---

## Dropea

| Stage | Classification | Evidence |
| --- | --- | --- |
| UI `/connections/dropea` | IMPLEMENTED | Setup panel + sync |
| API key input | IMPLEMENTED (UI) | |
| Credential storage | **MOCK / CONFIG_ERROR risk** | **Browser localStorage** — not server vault |
| HMAC secret storage | Same localStorage | |
| API client | IMPLEMENTED | `https://api.dropea.com/api/v1` |
| Polling / Sync now | IMPLEMENTED | `syncDropeaOrders` |
| Normalization | IMPLEMENTED | `normalize-dropea-order.ts` |
| DB persistence | IMPLEMENTED | Upsert orders/events `source` dropea |
| Webhook URL shown | IMPLEMENTED | Same public webhook family |
| Connection status | **PARTIAL / MOCK** | “linked” from localStorage; sync proves API when run |
| Error surfaces | PARTIAL | May show server config English strings |

**Data flow:** Operator token (local) → server fn fetch Dropea → normalize → Supabase → Orders (Dropea tab).  
Break risk: token never reaches server securely; multi-device / XSS exposure.

---

## Shopify

| Stage | Classification | Evidence |
| --- | --- | --- |
| UI | IMPLEMENTED | Connections + header switcher |
| OAuth | CONFIG_ERROR locally | `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` **absent** from `.env` names |
| Token fallback | MOCK / PARTIAL | localStorage token path |
| Sync | IMPLEMENTED when configured | `syncShopifyOrders` |
| Webhook | IMPLEMENTED | `/api/public/webhooks/shopify` |
| Orders in UI | PARTIAL | Appear under **Dropi** supply filter |

---

## WhatsApp Web / QR / Gateway

| Stage | Classification | Evidence |
| --- | --- | --- |
| `WHATSAPP_PROVIDER` | IMPLEMENTED | Default `whatsapp_web` |
| Provider registry | IMPLEMENTED | `whatsapp_web` active; `meta_cloud` legacy |
| Gateway URL | IMPLEMENTED / CONFIG | `WHATSAPP_GATEWAY_URL` present in `.env` names |
| Gateway health | **WORKING** | `{"ok":true,"baileys":true,"phase":5,...}` |
| Baileys | **WORKING** (local) | Session restored `351924371082` on boot (no QR scan this audit) |
| QR endpoint/SSE | IMPLEMENTED | `/v1/sessions/:id/events` |
| QR UI | IMPLEMENTED | `whatsapp-qr-panel.tsx` + `qrcode` lib |
| QR placeholder copy | UX_PROBLEM | i18n still says “next release” |
| Connect button → gateway | CODE_INFERENCE_WORKING | `startWhatsAppConnect` |
| Scan state / connected / reconnect / logout | IMPLEMENTED in code | Lifecycle tests pass; UI NOT_TESTABLE this pass |
| Session persistence | IMPLEMENTED | `whatsapp_sessions` + encryption key |
| Session encryption | IMPLEMENTED / CONFIG | `WHATSAPP_SESSION_ENCRYPTION_KEY` in `.env` |
| Inbound forward | IMPLEMENTED | HMAC verify; runtime reject without sig |
| Outbound send | IMPLEMENTED | `/v1/messages` |
| Meta Embedded Signup UI | NOT in active UI | Legacy folder only |
| Deploy with Vercel web | **NOT_IMPLEMENTED as one unit** | Gateway is separate Node process |

### Stage checklist (requested)

| Item | State |
| --- | --- |
| WHATSAPP_PROVIDER | IMPLEMENTED |
| whatsapp-web provider | IMPLEMENTED |
| gateway URL | IMPLEMENTED |
| gateway health | WORKING |
| QR stream | IMPLEMENTED |
| SSE | IMPLEMENTED |
| Baileys | WORKING (local restore) |
| session persistence | IMPLEMENTED |
| session encryption | IMPLEMENTED |
| whatsapp_connections / sessions / keys | IMPLEMENTED (migrations + code) |
| Realtime | IMPLEMENTED (migration inbound realtime) |
| reconnect | IMPLEMENTED (tests + gateway features) |
| logout/disconnect | IMPLEMENTED (code) |
| Production QR without dedicated gateway host | CONFIG_ERROR |

**Did not:** scan QR, message real customers.

---

## Supabase connection

| Client | Role | Status |
| --- | --- | --- |
| Browser `VITE_SUPABASE_*` | Auth + realtime | Present in `.env` names |
| SSR cookie client | Session | Present |
| Service role | Webhooks, list/sync, admin | Present in `.env` names |
| RLS | Authenticated SELECT; service role ALL (historical + workspace migrations) | Schema present; live RLS policy matrix not re-proven row-by-row this pass |

Screens consuming Supabase (code): Inbox, Orders, Templates, Profits, Connections WhatsApp/Shopify/Dropi webhook URL, webhooks.  
Screens still faux: Settings prefs, Dropi/Dropea “linked”, onboarding store step.

---

## Tracking / messaging integrity across connections

Messages must use **that order’s** supply data — enforced by rendering from `OperationalOrder` context (CODE_INFERENCE). Cross-supply queue mix (Shopify in Dropi tab) is the main isolation concern.

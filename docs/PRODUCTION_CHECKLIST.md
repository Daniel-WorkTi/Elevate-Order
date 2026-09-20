# ELEVATE — Production external checklist

**Purpose:** Actions you must perform outside the codebase before a brand-new operator can run the full path.  
**No secrets.** Values stay in your dashboards / password manager.

Canon: [PROJECT.md](../PROJECT.md) · [docs/CURRENT_STATE.md](./CURRENT_STATE.md)

---

## SUPABASE

### Apply pending migrations
- **WHERE:** Supabase Dashboard → SQL / Migrations (or CLI linked to the production project)
- **WHAT:** Apply at least:
  - `workspace_provider_credentials` (Dropea encrypted secrets)
  - `20260920150000_orders_last_whatsapp_contact.sql` (`orders.last_whatsapp_contact_at`)
  - any earlier WhatsApp / workspace migrations not yet on prod
- **EXPECTED RESULT:** Columns and tables exist; app no longer falls back to “migration missing” errors on Dropea save / contact stamp
- **HOW TO VERIFY:** Table editor shows `orders.last_whatsapp_contact_at`; `workspace_provider_credentials` exists

### Confirm Auth providers
- **WHERE:** Authentication → Providers
- **WHAT:** Enable Email and/or Google as intended for production
- **EXPECTED RESULT:** Signup/login works on the production URL
- **HOW TO VERIFY:** Create a throwaway account on production; session cookie persists after refresh

### Confirm site URL + redirect URLs
- **WHERE:** Authentication → URL configuration
- **WHAT:** Site URL = production app origin; redirect allowlist includes `/auth/callback` (and Google if used)
- **EXPECTED RESULT:** OAuth / magic link returns to the app without “redirect not allowed”
- **HOW TO VERIFY:** Complete Google or email login once on production

### RLS / service role (ops check only)
- **WHERE:** Project settings + Table policies
- **WHAT:** Ensure `SUPABASE_SERVICE_ROLE_KEY` is only on the Vercel server env (never `VITE_*`)
- **EXPECTED RESULT:** Browser bundle has no service role; server functions can write orders/events
- **HOW TO VERIFY:** Search built client assets for the service-role prefix; confirm server env in Vercel only

---

## VERCEL

### Set server environment variables (Production + Preview as needed)
- **WHERE:** Project → Settings → Environment Variables
- **WHAT:** Configure (names only — see CURRENT_STATE matrix):
  - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (client)
  - `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_SCOPES` (optional override)
  - `PUBLIC_APP_URL` (stable production origin for webhooks / OAuth redirect construction)
  - `ELEVATE_WEBHOOK_TOKEN`
  - `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` (or `WHATSAPP_TOKEN_ENCRYPTION_KEY`)
  - `WHATSAPP_GATEWAY_URL`, `GATEWAY_INTERNAL_SECRET`
  - `WHATSAPP_PROVIDER=whatsapp_web` (optional; default is web)
- **EXPECTED RESULT:** Deployed app reports integrations as configured where code checks env presence
- **HOW TO VERIFY:** Connections pages show configured (not “missing env”); no client exposure of secrets

### Confirm production domain
- **WHERE:** Domains
- **WHAT:** Custom domain or `*.vercel.app` production alias matches `PUBLIC_APP_URL`
- **EXPECTED RESULT:** Shopify redirect URI and Dropi webhook URL use the same origin operators paste externally
- **HOW TO VERIFY:** Open Connections → copy webhook / OAuth callback host matches the live site

---

## RAILWAY (WhatsApp gateway)

### Deploy `services/whatsapp-gateway`
- **WHERE:** Railway project hosting the gateway
- **WHAT:** Deploy the gateway service; set matching `GATEWAY_INTERNAL_SECRET` and session crypto keys used by the gateway code
- **EXPECTED RESULT:** `GET /health` (or gateway health endpoint) returns OK
- **HOW TO VERIFY:** Hit health from a private network or Railway logs; Vercel `WHATSAPP_GATEWAY_URL` points at this service

### Pair secret with Vercel
- **WHERE:** Railway env + Vercel env
- **WHAT:** Same `GATEWAY_INTERNAL_SECRET` on both sides (never in the browser)
- **EXPECTED RESULT:** Session create / QR / send JWT verification succeeds
- **HOW TO VERIFY:** Connections → WhatsApp → Connect shows QR; after scan, status = connected

### TLS
- **WHERE:** Railway / reverse proxy
- **WHAT:** Valid HTTPS; do **not** set `NODE_TLS_REJECT_UNAUTHORIZED=0` on production
- **EXPECTED RESULT:** Vercel → gateway HTTPS without certificate workarounds
- **HOW TO VERIFY:** Send a test message after connect; no TLS reject logs

---

## SHOPIFY

### Partner app redirect URL
- **WHERE:** Shopify Partner Dashboard → App → Allowed redirection URL(s)
- **WHAT:** Add `https://<PUBLIC_APP_URL>/auth/shopify/callback` (production; add Preview URL only if you use Preview OAuth)
- **EXPECTED RESULT:** OAuth start → Shopify → callback succeeds
- **HOW TO VERIFY:** Onboarding/Connections → Connect Shopify → return with Connected from `shopify_stores`

### App credentials on Vercel
- **WHERE:** Partner app credentials ↔ Vercel env
- **WHAT:** `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` match the Partner app
- **EXPECTED RESULT:** Token exchange succeeds; store row persisted
- **HOW TO VERIFY:** `shopify_stores` row for the workspace after install

### Scopes
- **WHERE:** Partner app + optional `SHOPIFY_APP_SCOPES`
- **WHAT:** Include scopes needed for order read/sync used by post-install sync
- **EXPECTED RESULT:** Initial sync can fetch orders without 401/403
- **HOW TO VERIFY:** After install, order count / last sync updates without API error toast

---

## DROPI

### Paste workspace webhook URL
- **WHERE:** Dropi Pro (external) webhook / notification settings for the store
- **WHAT:** Paste Elevate webhook URL from Connections/Onboarding (includes workspace token path as shown in UI)
- **EXPECTED RESULT:** Dropi posts events to Elevate
- **HOW TO VERIFY:** Send a test event or wait for a real status change; Connections shows Connected only after events exist for this workspace

### Align auth with Elevate
- **WHERE:** Dropi webhook headers/query as documented in UI + `ELEVATE_WEBHOOK_TOKEN` on Vercel
- **WHAT:** Token Dropi sends must match server auth resolution
- **EXPECTED RESULT:** Valid events accepted; invalid token rejected
- **HOW TO VERIFY:** Invalid token → 401; valid → order appears only in that workspace’s Dropi queue

---

## DROPEA

### Create API key + HMAC (if required by your Dropea account)
- **WHERE:** Dropea merchant/admin settings
- **WHAT:** Generate API key; paste into Elevate Connections/Onboarding Dropea form (server encrypts — never stored in browser storage as plaintext after submit)
- **EXPECTED RESULT:** Save succeeds only after API accepts the key; sync imports orders
- **HOW TO VERIFY:** Sync toast with imported count; orders appear under Dropea tab only

### Encryption key on Vercel
- **WHERE:** Vercel env
- **WHAT:** `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` present in Production
- **EXPECTED RESULT:** Credential save does not return encryption-unavailable error
- **HOW TO VERIFY:** Save form succeeds; status shows linked without revealing the key

---

## WHATSAPP

### Operator phone ready to scan QR
- **WHERE:** Physical WhatsApp on phone + Elevate Connections
- **WHAT:** Scan gateway QR; keep session alive
- **EXPECTED RESULT:** Status Connected; send works for E.164 phones on orders
- **HOW TO VERIFY:** Open a real order → send template → message arrives; order gets `last_whatsapp_contact_at` (Inbox can show Messaged/follow-up)

### Phone numbers on orders
- **WHERE:** Upstream Dropi/Dropea/Shopify customer data
- **WHAT:** Prefer international numbers (`+351…`). Elevate does not invent country codes for ambiguous local numbers
- **EXPECTED RESULT:** Send blocked with clear error when phone cannot be normalized
- **HOW TO VERIFY:** Order with `912…` only → send refused; order with `+351912…` → send allowed when WA connected

---

## Manual E2E smoke (after above)

1. New user → signup → onboarding  
2. Connect Shopify (or skip) → Connect Dropi and/or Dropea → Connect WhatsApp  
3. Ingest one real supply event/order  
4. Inbox shows that order under the correct supply tab  
5. Open detail → render message → send WhatsApp  
6. Confirm contact state updates (Messaged / follow-up), not on button click alone  

If any step fails, stop and fix that external link before coding further.

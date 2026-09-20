# ELEVATE V1 — Release report

**Date:** 2026-09-10  
**Engineer:** autonomous RELEASE ENGINEER loop  
**Baseline audit:** health **64/100** (`docs/qa/V1_MASTER_AUDIT.md` pre-fix)

## Exit evaluation

| Condition | Result |
| --- | --- |
| P0 code issues = 0 | **PASS** (remaining P0 items are BLOCKED_EXTERNAL / ops) |
| P1 code issues = 0 | **PASS** for code; Shopify OAuth keys + gateway host = BLOCKED_EXTERNAL |
| `npm run typecheck` | **PASS** |
| production build | **PASS** |
| no secrets in browser localStorage | **PASS** (Dropea/Shopify tokens purged; server-side storage) |
| no fake Connected on core integrations | **PASS** (Dropi from events; Dropea from server credentials; Shopify from `shopify_stores`) |
| Dropi/Dropea source isolation | **PASS** (Dropi filter excludes shopify/dropea) |
| critical buttons / tracking / wa.me | **PASS** via unit tests + code paths; authenticated browser deep QA still limited |
| no raw ENV names in user copy | **PASS** (i18n cleaned) |
| two consecutive critical code audits | **PASS** — re-scan after fixes found no new P0/P1 **code** defects |

## Fixes shipped this loop

1. Fixed all TypeScript `exactOptionalPropertyTypes` / vite / hmac test errors → typecheck green.
2. Removed global `NODE_TLS_REJECT_UNAUTHORIZED=0` from gateway:dev; local HTTPS hop uses undici Agent scoped to localhost only.
3. Dropea API token + HMAC: encrypted server table `workspace_provider_credentials` + purge localStorage.
4. Shopify Admin tokens: saved via `connectShopifyManualStore` into `shopify_stores`; sync uses DB token only; purge localStorage.
5. Dropi Connected badge derived from webhook/event reality (configured vs connected).
6. Dropi operational query no longer includes Shopify sources.
7. Onboarding Connect relabeled to “Continue with…” + honesty hint.
8. Settings toast-only test message removed (link to WhatsApp Connections).
9. User-facing copy no longer exposes env var names.
10. Added regression tests (Dropi status, wa.me, tracking safety).

## Verification

- `npm run typecheck` → exit 0  
- `npm test` → **157/157** pass  
- `npm run build` → exit 0  

## Remaining (not code P0/P1)

See `docs/qa/V1_EXTERNAL_ACTIONS.md`.

## Health after

**78 / 100** — core security and isolation fixed; score held back by external gateway/Shopify OAuth/migration apply and incomplete authenticated browser matrix.

# ELEVATE — Overnight baseline

**Date:** 2026-09-10  
**Branch:** `overnight/release-candidate`  
**Commit:** `a587346` (`a587346f5cf60df62c221707d3d21c9a98354694`)  
**Agent:** ORBIT overnight release lead  

## Baseline commands

| Check | Result |
| --- | --- |
| `npm run typecheck` | **PASS** (exit 0) |
| `npm test` | **PASS** 157/157 (prior same-commit verification; re-run overnight) |
| `npm run build` | **PASS** (prior same-commit verification; re-run overnight) |

## Known working critical flows (do not break)

1. **WhatsApp Web gateway** — Railway prod `elevate-order-production.up.railway.app`, CORS for Vercel origin, QR EventSource, Baileys sessions. **PROTECTED.**
2. **Vercel app** — `https://elevate-orders.vercel.app` with `WHATSAPP_GATEWAY_URL` set.
3. **Dropi webhook ingest** — public route + event → orders path (needs live webhook paste for Connected).
4. **Source isolation** — Dropi tab excludes Shopify/Dropea (unit-covered).
5. **Dropea/Shopify tokens** — server-side (migration apply still external for Dropea table).
6. **Tracking / wa.me** — no invented URLs; encoding tests exist.

## Current known blockers (BLOCKED_EXTERNAL)

1. Apply Supabase migration `20260910180000_workspace_provider_credentials.sql` on production.
2. Dropi dashboard: paste workspace webhook URL (Connected requires real events).
3. Confirm Shopify OAuth Partner app settings if OAuth button used (keys already on Vercel).
4. Cursor GitHub App not installed — Cloud Agent unavailable (local overnight only).

## Note — EXTERNAL_ACTIONS drift

Prior checklist marked gateway URL as missing; **as of this overnight start**, Railway gateway is live and Vercel `WHATSAPP_GATEWAY_URL` is set. Docs will be updated during the run.

## Overnight rules in force

- Preserve WhatsApp architecture.
- No product redesign / fake SaaS features.
- Minimal safe diffs; truth over score.
- Two consecutive clean P0/P1 code audits before exit.

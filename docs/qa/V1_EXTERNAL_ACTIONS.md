# ELEVATE V1 — External actions (human only)

These items **cannot** be completed by the agent without your credentials/dashboards.

1. **Apply Supabase migration** `supabase/migrations/20260910180000_workspace_provider_credentials.sql` on the production (and staging) database so Dropea credentials can be stored server-side.
2. **Confirm Vercel env** matches `docs/qa/V1_VERCEL_ENV_CHECKLIST.md` — especially `SUPABASE_*`, `PUBLIC_APP_URL`, `WHATSAPP_GATEWAY_URL`, `GATEWAY_INTERNAL_SECRET`, `WHATSAPP_TOKEN_ENCRYPTION_KEY` (used to encrypt Dropea secrets).
3. **Provision WhatsApp gateway host** (always-on) with `WHATSAPP_SESSION_ENCRYPTION_KEY`, `GATEWAY_INTERNAL_SECRET`, `ELEVATE_INBOUND_URL` pointing at production, and set `WHATSAPP_GATEWAY_URL` on Vercel to that host. See `docs/qa/V1_GATEWAY_SETUP.md`.
4. **Optional Shopify OAuth:** set `SHOPIFY_API_KEY` + `SHOPIFY_API_SECRET` in Vercel if you want Connect with Shopify (Partner app). Manual `shpat_` path works without them (token saved server-side). *(Already present on Vercel.)*
5. **Dropi:** paste the workspace webhook URL into Dropi / Zapier — Connected badge only turns green after real events arrive.
6. **Do not** set `NODE_TLS_REJECT_UNAUTHORIZED=0` on any production gateway host.

### Progress (2026-09-10)

- [x] `WHATSAPP_PROVIDER` added to Vercel Production + Preview
- [x] `GATEWAY_INTERNAL_SECRET` added to Vercel Production + Preview
- [x] `WHATSAPP_TOKEN_ENCRYPTION_KEY` already on Vercel
- [x] Shopify OAuth keys already on Vercel
- [ ] `WHATSAPP_GATEWAY_URL` public (blocked: local `.env` points to localhost)
- [ ] Gateway host deployed
- [ ] Migration `20260910180000` applied on Supabase

No secret values are listed here on purpose.

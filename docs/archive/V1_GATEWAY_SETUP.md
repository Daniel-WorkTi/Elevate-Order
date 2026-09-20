# WhatsApp Gateway — production setup

The web app on Vercel **cannot** talk to `localhost:8787`.
You need a public HTTPS URL for the gateway, then set `WHATSAPP_GATEWAY_URL` on Vercel.

## Railway (recommended for this project)

**Guia completo em português:** [`V1_RAILWAY_GATEWAY.md`](./V1_RAILWAY_GATEWAY.md)

Resumo:

1. Deploy do repo no Railway (usa `railway.toml` + `services/whatsapp-gateway/Dockerfile`)
2. Env no Railway: `SUPABASE_*`, `GATEWAY_INTERNAL_SECRET`, `WHATSAPP_SESSION_ENCRYPTION_KEY`, `ELEVATE_INBOUND_URL=https://elevate-orders.vercel.app`
3. Generate Domain → testa `/health`
4. Na Vercel: `WHATSAPP_GATEWAY_URL=https://sua-url.up.railway.app` + Redeploy

## 1. What already went to Vercel (done)

- `WHATSAPP_PROVIDER`
- `GATEWAY_INTERNAL_SECRET`
- `WHATSAPP_TOKEN_ENCRYPTION_KEY` (already existed)

## 2. Deploy the gateway (pick one host)

Recommended: **Railway** (see above). Alternatives: Render, or a small VPS / Oracle Always Free.

### Env on the gateway host

| Name | Notes |
| --- | --- |
| `SUPABASE_URL` | Same as Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Same as Vercel |
| `GATEWAY_INTERNAL_SECRET` | **Same** value as Vercel |
| `WHATSAPP_SESSION_ENCRYPTION_KEY` | From your local `.env` |
| `ELEVATE_INBOUND_URL` | `https://elevate-orders.vercel.app` |
| `WHATSAPP_GATEWAY_PORT` | Optional locally; Railway sets `PORT` |
| `WHATSAPP_GATEWAY_CORS_ORIGINS` | Optional: `https://elevate-orders.vercel.app` |

### Start command (local / VPS)

```bash
cd services/whatsapp-gateway
npx tsx src/dev.ts
```

Or from repo root:

```bash
npm run gateway:dev
```

Health check: `GET https://YOUR-GATEWAY-HOST/health` → `{"ok":true,...}`

## 3. Point Vercel at the gateway

In Vercel → Project → Settings → Environment Variables → Production + Preview:

- `WHATSAPP_GATEWAY_URL` = `https://YOUR-GATEWAY-HOST` (no trailing slash)

Then **Redeploy** the web app.

## 4. Supabase migration (Dropea secrets)

In Supabase → SQL Editor, run the file:

`supabase/migrations/20260910180000_workspace_provider_credentials.sql`

## 5. Local-only testing (no public gateway)

Keep using:

- `npm run dev` (app)
- `npm run gateway:dev` (gateway)

Local `.env` already has `WHATSAPP_GATEWAY_URL=http://127.0.0.1:8787` — that is correct **only** for local.

# WhatsApp Gateway — Railway (passo a passo)

A app web fica na **Vercel**. O gateway WhatsApp corre no **Railway** (processo 24/7).

## 0. Pré-requisito

O código do gateway (Dockerfile + `railway.toml`) tem de estar no GitHub do projeto.
Se ainda não fizeste push destas alterações, diz ao agente para **commit + push**.

## 1. Conta Railway

1. Abre https://railway.com → Login (GitHub)
2. Aceita o **Free Trial** ($5 crédito / 30 dias)

## 2. Novo projeto a partir do repo

1. **New Project** → **Deploy from GitHub repo**
2. Escolhe `Elevate-Order` (ou o nome do teu fork)
3. Se pedir branch: `main`
4. Railway deve detetar `railway.toml` + Dockerfile automaticamente

Se criar um serviço “errado” (ex. tenta build Vite):

- Settings → **Root Directory**: `/` (raiz do repo)
- Settings → **Builder**: Dockerfile
- Settings → **Dockerfile Path**: `services/whatsapp-gateway/Dockerfile`

## 3. Variáveis de ambiente (Railway → Variables)

Copia **os mesmos valores** do teu `.env` local (não partilhes estes valores no chat):

| Variável | De onde |
| --- | --- |
| `SUPABASE_URL` | `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` |
| `GATEWAY_INTERNAL_SECRET` | `.env` — **igual** ao da Vercel |
| `WHATSAPP_SESSION_ENCRYPTION_KEY` | `.env` |
| `ELEVATE_INBOUND_URL` | `https://elevate-orders.vercel.app` |
| `WHATSAPP_GATEWAY_CORS_ORIGINS` | `https://elevate-orders.vercel.app` (opcional) |

**Não** precisas de `WHATSAPP_GATEWAY_URL` no Railway — isso vai na Vercel.

Redeploy depois de guardar as variáveis.

## 4. Domínio público

1. Railway → serviço → **Settings** → **Networking** → **Generate Domain**
2. Copia a URL (ex. `https://elevate-wa-gateway-production-xxxx.up.railway.app`)
3. Testa no browser: `https://SUA-URL/health` → deve mostrar `{"ok":true,...}`

## 5. Ligar a Vercel

Na Vercel → Project → Settings → Environment Variables → Production + Preview:

- `WHATSAPP_GATEWAY_URL` = `https://SUA-URL-RAILWAY` (sem barra no fim)

Depois **Redeploy** da app web.

## 6. Testar no produto

1. Abre https://elevate-orders.vercel.app → Connections → WhatsApp
2. Connect → QR
3. Escaneia com o telemóvel

## Troubleshooting

| Sintoma | Fix |
| --- | --- |
| Build falha | Confirma Dockerfile path `services/whatsapp-gateway/Dockerfile` |
| Crash ao arrancar `missing env` | Falta alguma variável da tabela acima |
| `/health` 502 | Espera 1–2 min; vê Deploy Logs |
| QR não aparece | Confirma `WHATSAPP_GATEWAY_URL` na Vercel + redeploy |
| 401 no gateway | `GATEWAY_INTERNAL_SECRET` diferente entre Vercel e Railway |

## Custo

- Trial: grátis ~30 dias / $5 crédito
- Depois: Free ($1 crédito/mês) pode não chegar para 24/7 → Hobby ~$5/mês

---
name: elevate-web-qa
description: >-
  Testa todas as funções do sistema web ELEVATE Orders (rotas, board de pedidos,
  WhatsApp, painéis financeiros, ads Meta, webhook/API, settings, pricing, help).
  Use when the user asks to test the web app, QA, regression, smoke test, or
  verificar funções do dashboard Elevate.
---

# ELEVATE Web QA Agent

Agente de teste manual/sistemático do app em `http://localhost:8080` (ou URL que o usuário indicar).

## Antes de testar

1. Confirmar `npm run dev` rodando e home com HTTP 200.
2. Ler [PROJECT_READER.md](../../../PROJECT_READER.md) para saber o que é mock vs real.
3. Não inventar backend: se a UI só mostra toast/`localStorage`/dados hardcoded, reportar como **mock** (não como bug de rede).
4. Nunca expor nem commitá-las: service role, tokens WA, secrets do `.env`.

## Matriz de funções (executar nesta ordem)

Copie e marque o progresso:

```
QA Progress:
- [ ] Shell: nav, theme, 404
- [ ] Dashboard /
- [ ] Orders /orders
- [ ] Analytics /analytics
- [ ] Ads /ads
- [ ] Integração API /integracao-api
- [ ] Settings /settings
- [ ] Pricing /pricing
- [ ] Help /help
- [ ] Webhook POST (se env permitir)
```

### 1. Shell

- Navegar por todos os links da sidebar (Operação / Integrações / Conta).
- Alternar tema claro/escuro; recarregar e confirmar persistência (`elevate-theme`).
- Busca global do header: **esperado** não filtrar nada (gap conhecido).
- Abrir rota inexistente → 404 com link home.

### 2. Dashboard `/`

- Stats Confirmed / Messaged / Unanswered / Incidents batem com contagens do mock.
- ProfitPanel: toggles Lucro bruto/líquido e EUR/BRL atualizam valores.
- Link “Abrir Integração Ads” → `/ads`.
- MoneyPanel: EUR/BRL; cards retido/recuperado; taxas Dropi/Dropea.
- OrdersBoard embutido: abrir card Details e botão WhatsApp.

### 3. Orders `/orders`

- Tabs All / Confirmed / Messaged / Unanswered / Incident com contadores.
- Busca por order ID, cliente e CEP.
- Select “Last 7/30/90 days”: **esperado** não filtrar (gap conhecido) — registrar.
- Card: “Enviar mensagem” abre `wa.me` com texto coerente ao status/motivo.
- Dialog: editar textarea, Open in WhatsApp, Queue send → toast.

### 4. Analytics `/analytics`

- 4 KPIs visíveis.
- Charts carregam (ClientOnly/Suspense); sem crash SSR.

### 5. Ads `/ads`

- Conectar/Desconectar Meta (estado local).
- Persistir ID conta e gasto (`elevate-ad-account`, `elevate-ad-spend`).
- Alterar gasto e voltar ao Dashboard: lucro líquido deve refletir o novo valor.
- Tabela de campanhas renderiza; ROAS/CPA recalculam.

### 6. Integração API `/integracao-api`

- URL do webhook e headers `apikey` visíveis.
- Tabela: lista pedidos **ou** empty state **ou** mensagem de erro amigável.
- Se faltar `SUPABASE_SERVICE_ROLE_KEY`, reportar como **bloqueio P0**, não falha de UI.

### 7. Settings `/settings`

- Submit → toast “Settings saved” (sem persistência real).
- “Send test message” → toast.
- Toggles Dropi/Dropea/auto-message interativos.

### 8. Pricing `/pricing`

- 3 planos; CTA → toast “{plan} plan selected”.
- Plano Pro destacado.

### 9. Help `/help`

- Accordion FAQ abre/fecha.
- Card Contact support aponta para WhatsApp externo.

### 10. Webhook (opcional, só com service role)

- `POST /api/public/webhooks/orders` sem `apikey` → 401.
- Payload inválido → 422.
- Payload válido → `{ ok: true }` e linha nova/atualizada em Integração API após ~30s.
- Não documentar nem colar a service role na resposta ao usuário.

## Formato do relatório

```markdown
# Relatório QA ELEVATE — YYYY-MM-DD

## Ambiente
- URL:
- Branch/commit:
- Service role presente: sim/não

## Resumo
- Passou: N
- Falhou: N
- Gaps conhecidos (mock): N

## Resultados
| Área | Caso | Resultado | Notas |
| --- | --- | --- | --- |
| Orders | Busca CEP | PASS/FAIL/SKIP | |

## Bugs novos
1. Severidade · rota · passos · esperado · obtido

## Gaps já conhecidos (não abrir como bug novo)
- Board usa mock, não Supabase
- Filtro de data sem efeito
- Settings/Pricing/Ads connect sem backend
- Auth UI ausente
```

## Regras

- Preferir evidência (status HTTP, toast, valor na tela) a opinião.
- Separar **FAIL** (quebrado) de **GAP** (propositalmente mock).
- Após mudanças de código, reexecutar só a área afetada + smoke das rotas.
- Responder ao usuário em português, curto, com a tabela de resultados.

import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Radio, Truck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { listSyncedOrders } from "@/lib/synced-orders.functions";

const syncedOrdersQuery = queryOptions({
  queryKey: ["synced-orders"],
  queryFn: () => listSyncedOrders(),
  refetchInterval: 30_000,
});

export const Route = createFileRoute("/integracao-api")({
  head: () => ({
    meta: [
      { title: "Integração API — ELEVATE" },
      {
        name: "description",
        content:
          "Receba eventos de pedidos das suas plataformas por webhook: status, rastreio, transportadora e valor sincronizados em tempo real.",
      },
      { property: "og:title", content: "Integração API — ELEVATE" },
      {
        property: "og:description",
        content: "Endpoint de webhook, formato do payload e feed ao vivo dos pedidos sincronizados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <AppShell title="Integração API" subtitle="Falha ao carregar os pedidos sincronizados.">
      <p className="text-sm text-danger">Tente recarregar a página.</p>
    </AppShell>
  ),
  component: IntegracaoApiPage,
});

const payloadExample = `{
  "order_id": 123456,
  "event_date": "2026-08-10T17:45:00Z",
  "status_id": 7,
  "status_name": "Entregado",
  "details": "Entregue ao destinatário",
  "tracking_code": "LP123456789PT",
  "tracking_url": "https://rastreio.exemplo/LP123456789PT",
  "shopify_order_id": 987654,
  "shipping_company": "CTT Express",
  "total": "50.00"
}`;

function money(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function OrdersTable() {
  const { data } = useSuspenseQuery(syncedOrdersQuery);

  if (data.error) {
    return <p className="text-sm text-danger">{data.error}</p>;
  }

  if (data.orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <Radio className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Nenhum evento recebido ainda</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure o webhook na sua plataforma e o primeiro pedido aparece aqui em segundos.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-4">Pedido</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Transportadora</th>
            <th className="py-2 pr-4">Rastreio</th>
            <th className="py-2 pr-4 text-right">Total</th>
            <th className="py-2 text-right">Último evento</th>
          </tr>
        </thead>
        <tbody>
          {data.orders.map((order) => (
            <tr key={order.order_id} className="border-b border-border/60 last:border-0">
              <td className="py-3 pr-4 font-medium">#{order.order_id}</td>
              <td className="py-3 pr-4">{order.status_name ?? `Status ${order.status_id ?? "—"}`}</td>
              <td className="py-3 pr-4 text-muted-foreground">{order.shipping_company ?? "—"}</td>
              <td className="py-3 pr-4 text-muted-foreground">
                {order.tracking_url ? (
                  <a
                    className="text-electric hover:underline"
                    href={order.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {order.tracking_code ?? "Rastrear"}
                  </a>
                ) : (
                  (order.tracking_code ?? "—")
                )}
              </td>
              <td className="py-3 pr-4 text-right font-semibold">{money(order.total)}</td>
              <td className="py-3 text-right text-muted-foreground">
                {order.last_event_at ? new Date(order.last_event_at).toLocaleString("pt-PT") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IntegracaoApiPage() {
  const webhookUrl =
    "https://project--4a8c431c-953c-4758-bf25-82e9c50d2d8f.lovable.app/api/public/webhooks/orders";
  const apiKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

  return (
    <AppShell
      title="Integração API"
      subtitle="Receba os eventos de pedidos das suas plataformas e alimente o dashboard automaticamente."
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2">
            <Radio className="size-5 text-electric" />
            <h2 className="font-display text-lg font-semibold">Endpoint do webhook</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre esta URL na sua plataforma (Dropi Pro, Dropea ou Shopify) para enviar cada
            mudança de status.
          </p>

          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">URL (POST)</dt>
              <dd className="mt-1 break-all rounded-lg bg-muted px-3 py-2 font-mono text-xs">
                {webhookUrl}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Cabeçalhos obrigatórios
              </dt>
              <dd className="mt-1 rounded-lg bg-muted px-3 py-2 font-mono text-xs">
                Content-Type: application/json
                <br />
                apikey: {apiKey ?? "<chave pública do projeto>"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Corpo aceito (objeto único ou lista)
              </dt>
              <dd className="mt-1 whitespace-pre rounded-lg bg-muted px-3 py-2 font-mono text-xs">
                {payloadExample}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-xs text-muted-foreground">
            Eventos repetidos (mesmo pedido, data e status) são ignorados automaticamente — pode
            reenviar o histórico sem duplicar nada.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2">
            <Truck className="size-5 text-info" />
            <h2 className="font-display text-lg font-semibold">Pedidos sincronizados</h2>
          </div>
          <p className="mt-2 mb-4 text-sm text-muted-foreground">
            Atualiza automaticamente a cada 30 segundos.
          </p>
          <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
            <OrdersTable />
          </Suspense>
        </section>
      </div>
    </AppShell>
  );
}

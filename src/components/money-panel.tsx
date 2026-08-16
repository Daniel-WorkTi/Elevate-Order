import { useState } from "react";
import { Banknote, PackageCheck, TriangleAlert, Plug } from "lucide-react";

import { useExchangeRate } from "@/components/app-shell/use-exchange-rate";
import { formatMoney } from "@/lib/money/format-money";
import { orders, type Order } from "@/lib/orders";

/** Legacy panel — uses shared FX hook; never hardcodes a rate. */
function useMoney(currency: "EUR" | "BRL") {
  const fx = useExchangeRate("EUR", "BRL");
  return (valueEur: number) => {
    if (currency === "EUR") return formatMoney(valueEur, "EUR", "pt-PT");
    if (typeof fx.rate !== "number" || !Number.isFinite(fx.rate)) return "—";
    return formatMoney(valueEur * fx.rate, "BRL", "pt-BR");
  };
}

function sum(list: Order[]) {
  return list.reduce((acc, o) => acc + o.total, 0);
}

function rate(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function platformStats(source: Order["source"]) {
  const list = orders.filter((o) => o.source === source);
  const confirmed = list.filter((o) => o.status === "confirmed");
  const delivered = list.filter((o) => o.status === "confirmed" || o.status === "messaged");
  const incidents = list.filter((o) => o.status === "incident");
  return {
    source,
    total: list.length,
    confirmedRate: rate(confirmed.length, list.length),
    deliveredRate: rate(delivered.length, list.length),
    incidentRate: rate(incidents.length, list.length),
  };
}

export function MoneyPanel() {
  const [currency, setCurrency] = useState<"EUR" | "BRL">("EUR");
  const money = useMoney(currency);

  const incidents = orders.filter((o) => o.status === "incident");
  const recovered = orders.filter((o) => o.status === "confirmed" || o.status === "messaged");
  const held = sum(incidents);
  const delivered = sum(recovered);

  const platforms = [platformStats("Dropi Pro"), platformStats("Dropea")];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Financeiro & integrações</h2>
        <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-card)]">
          {(["EUR", "BRL"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                currency === c
                  ? "gradient-cta text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c === "EUR" ? "€ Euro" : "R$ Real"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-lift rounded-2xl border border-danger/25 bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-danger" />
            <p className="text-sm font-medium text-muted-foreground">Dinheiro retido em incidências</p>
          </div>
          <p className="mt-3 text-[40px] font-bold leading-none text-danger">{money(held)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {incidents.length} pedidos parados aguardando resposta do cliente
          </p>
        </div>

        <div className="card-lift rounded-2xl border border-success/25 bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2">
            <PackageCheck className="size-5 text-success" />
            <p className="text-sm font-medium text-muted-foreground">
              Pedidos entregues por conta das mensagens
            </p>
          </div>
          <p className="mt-3 text-[40px] font-bold leading-none text-success">{money(delivered)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {recovered.length} pedidos recuperados via WhatsApp
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <Plug className="size-5 text-electric" />
          <p className="text-sm font-medium text-muted-foreground">
            Integrações conectadas · taxas por plataforma
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {platforms.map((p) => (
            <div key={p.source} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{p.source}</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                  <span className="size-1.5 rounded-full bg-success" /> Conectado
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[22px] font-bold leading-none text-success">{p.confirmedRate}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Confirmados</p>
                </div>
                <div>
                  <p className="text-[22px] font-bold leading-none text-info">{p.deliveredRate}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Entregues</p>
                </div>
                <div>
                  <p className="text-[22px] font-bold leading-none text-danger">{p.incidentRate}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Incidências</p>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Banknote className="size-3.5" />
                {money(sum(orders.filter((o) => o.source === p.source)))} em pedidos sincronizados
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Câmbio via conversor global (AppShell). Sem taxa hardcoded.
        </p>
      </div>
    </section>
  );
}

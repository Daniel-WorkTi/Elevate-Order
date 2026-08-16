import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Megaphone, TrendingUp, Wallet, Link2, PiggyBank } from "lucide-react";

import { useExchangeRate } from "@/components/app-shell/use-exchange-rate";
import { formatMoney } from "@/lib/money/format-money";
import { orders, type Order } from "@/lib/orders";

/** Custo médio de produto + envio estimado sobre a receita entregue. */
const COGS_RATE = 0.42;
const AD_SPEND_KEY = "elevate-ad-spend";

function sum(list: Order[]) {
  return list.reduce((acc, o) => acc + o.total, 0);
}

export function ProfitPanel() {
  const [currency, setCurrency] = useState<"EUR" | "BRL">("EUR");
  const [mode, setMode] = useState<"gross" | "net">("net");
  const [adSpend, setAdSpend] = useState(1180);
  const [metaConnected] = useState(false);
  const fx = useExchangeRate("EUR", "BRL");

  useEffect(() => {
    const saved = localStorage.getItem(AD_SPEND_KEY);
    if (saved) setAdSpend(Number(saved) || 0);
  }, []);

  const money = (valueEur: number) => {
    if (currency === "EUR") return formatMoney(valueEur, "EUR", "pt-PT");
    if (typeof fx.rate !== "number" || !Number.isFinite(fx.rate)) return "—";
    return formatMoney(valueEur * fx.rate, "BRL", "pt-BR");
  };

  const delivered = orders.filter((o) => o.status === "confirmed" || o.status === "messaged");
  const incidents = orders.filter((o) => o.status === "incident");

  const revenue = sum(delivered);
  const cogs = revenue * COGS_RATE;
  const held = sum(incidents);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - adSpend;
  const profit = mode === "gross" ? grossProfit : netProfit;
  const margin = revenue ? Math.round((profit / revenue) * 100) : 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Lucro da operação no momento</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-card)]">
            {(
              [
                { key: "gross", label: "Lucro bruto" },
                { key: "net", label: "Lucro líquido" },
              ] as const
            ).map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === m.key
                    ? "gradient-cta text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
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
      </div>

      <div className="card-lift rounded-2xl border border-electric/25 bg-card p-6 shadow-[var(--shadow-glow)]">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-5 text-electric" />
          <p className="text-sm font-medium text-muted-foreground">
            {mode === "gross"
              ? "Lucro bruto (sem descontar anúncios)"
              : "Lucro líquido (após investimento em anúncios Meta)"}
          </p>
        </div>
        <p
          className={`mt-3 text-[56px] font-bold leading-none tracking-tight ${
            profit >= 0 ? "text-success" : "text-danger"
          }`}
        >
          {money(profit)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Margem de {margin}% sobre {money(revenue)} entregues · {money(held)} ainda retidos em
          incidências
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="size-3.5" /> Receita entregue
            </p>
            <p className="mt-2 text-[22px] font-bold leading-none">{money(revenue)}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <PiggyBank className="size-3.5" /> Custo de produto + envio
            </p>
            <p className="mt-2 text-[22px] font-bold leading-none text-muted-foreground">
              −{money(cogs)}
            </p>
          </div>
          <div
            className={`rounded-xl border p-4 ${
              mode === "net" ? "border-danger/25" : "border-border opacity-60"
            }`}
          >
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Megaphone className="size-3.5" /> Anúncios Meta
            </p>
            <p
              className={`mt-2 text-[22px] font-bold leading-none ${
                mode === "net" ? "text-danger" : "text-muted-foreground"
              }`}
            >
              {mode === "net" ? `−${money(adSpend)}` : "não descontado"}
            </p>
          </div>
        </div>
      </div>

      <Link
        to="/ads"
        className="card-lift flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center gap-2">
          <Link2 className="size-5 text-electric" />
          <div>
            <p className="font-semibold">Integração Ads · Meta</p>
            <p className="text-sm text-muted-foreground">
              {metaConnected
                ? "Conectada · gasto sincronizado automaticamente"
                : `Gasto informado: ${money(adSpend)} · configure e monitore em Integração Ads`}
            </p>
          </div>
        </div>
        <span className="gradient-cta rounded-xl px-4 py-2 text-sm font-semibold text-white">
          Abrir Integração Ads
        </span>
      </Link>

    </section>
  );
}

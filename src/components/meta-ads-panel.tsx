import { useEffect, useState } from "react";
import { Link2, Megaphone, Target, TrendingUp, Wallet } from "lucide-react";

import { useExchangeRate } from "@/components/app-shell/use-exchange-rate";
import { formatMoney } from "@/lib/money/format-money";
import { orders, type Order } from "@/lib/orders";

const AD_SPEND_KEY = "elevate-ad-spend";
const AD_ACCOUNT_KEY = "elevate-ad-account";

function sum(list: Order[]) {
  return list.reduce((acc, o) => acc + o.total, 0);
}

const campaigns = [
  { name: "ADV+ Escala | ES", spend: 520, results: 41, status: "Ativa" },
  { name: "Retargeting 7d", spend: 180, results: 19, status: "Ativa" },
  { name: "Teste criativos v3", spend: 260, results: 9, status: "Aprendizagem" },
  { name: "Lookalike 1% compradores", spend: 220, results: 14, status: "Ativa" },
] as const;

export function MetaAdsPanel() {
  const [currency, setCurrency] = useState<"EUR" | "BRL">("EUR");
  const [adSpend, setAdSpend] = useState(1180);
  const [adAccount, setAdAccount] = useState("");
  const [connected, setConnected] = useState(false);
  const fx = useExchangeRate("EUR", "BRL");

  useEffect(() => {
    const saved = localStorage.getItem(AD_SPEND_KEY);
    if (saved) setAdSpend(Number(saved) || 0);
    const acc = localStorage.getItem(AD_ACCOUNT_KEY);
    if (acc) setAdAccount(acc);
  }, []);

  const money = (valueEur: number) => {
    if (currency === "EUR") return formatMoney(valueEur, "EUR", "pt-PT");
    if (typeof fx.rate !== "number" || !Number.isFinite(fx.rate)) return "—";
    return formatMoney(valueEur * fx.rate, "BRL", "pt-BR");
  };

  const delivered = orders.filter((o) => o.status === "confirmed" || o.status === "messaged");
  const revenue = sum(delivered);
  const roas = adSpend ? revenue / adSpend : 0;
  const cpa = delivered.length ? adSpend / delivered.length : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link2 className="size-5 text-electric" />
            <div>
              <p className="font-semibold">Conta de anúncios Meta</p>
              <p className="text-sm text-muted-foreground">
                {connected
                  ? "Conectada · gasto sincronizado automaticamente"
                  : "Conecte sua conta para puxar o gasto de anúncios em tempo real"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-border p-1">
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
            <button
              type="button"
              onClick={() => setConnected((v) => !v)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                connected
                  ? "border border-border text-muted-foreground hover:text-foreground"
                  : "gradient-cta text-white"
              }`}
            >
              {connected ? "Desconectar" : "Conectar Meta"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted-foreground">ID da conta de anúncios (act_…)</span>
            <input
              value={adAccount}
              onChange={(e) => {
                setAdAccount(e.target.value);
                localStorage.setItem(AD_ACCOUNT_KEY, e.target.value);
              }}
              placeholder="act_1234567890"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-electric"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Gasto com anúncios hoje (€)</span>
            <input
              type="number"
              min={0}
              step={10}
              value={adSpend}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                setAdSpend(v);
                localStorage.setItem(AD_SPEND_KEY, String(v));
              }}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-base font-semibold outline-none focus:border-electric"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Enquanto a conta Meta não estiver conectada, informe o gasto manualmente — o lucro líquido
          do dashboard usa esse valor.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Investimento hoje", value: money(adSpend), icon: Megaphone, tone: "text-danger" },
          { label: "Receita entregue", value: money(revenue), icon: Wallet, tone: "text-success" },
          { label: "ROAS", value: `${roas.toFixed(2)}x`, icon: TrendingUp, tone: "text-electric" },
          { label: "CPA médio", value: money(cpa), icon: Target, tone: "text-info" },
        ].map((k) => (
          <div
            key={k.label}
            className="card-lift rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
          >
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <k.icon className={`size-3.5 ${k.tone}`} /> {k.label}
            </p>
            <p className="mt-2 text-[28px] font-bold leading-none tracking-tight">{k.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-lg font-semibold">Campanhas monitoradas</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2">Campanha</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Gasto</th>
                <th className="pb-2 text-right">Resultados</th>
                <th className="pb-2 text-right">Custo/resultado</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.name} className="border-t border-border">
                  <td className="py-3 font-medium">{c.name}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === "Ativa"
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">{money(c.spend)}</td>
                  <td className="py-3 text-right">{c.results}</td>
                  <td className="py-3 text-right">{money(c.spend / c.results)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

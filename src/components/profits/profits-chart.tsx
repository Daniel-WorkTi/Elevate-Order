import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney } from "@/lib/money/format-money";
import type { ChartPoint } from "@/lib/profits/aggregate";

export function ProfitsChart({
  points,
  currency,
}: {
  points: ChartPoint[];
  currency: string;
}) {
  return (
    <section className="rounded-[16px] border border-border bg-card p-5">
      <div className="mb-4">
        <h2 className="text-[15px] font-semibold text-foreground">Financial performance</h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Revenue from synchronized order totals. Cost and profit series appear when those fields
          exist.
        </p>
      </div>

      {points.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-[13px] text-muted-foreground">
          No chart data for this period.
        </div>
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E6E8EC" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#667085", fontSize: 11 }}
                axisLine={{ stroke: "#E6E8EC" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#667085", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={64}
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat("pt-PT", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(value)
                }
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const revenue = payload[0]?.value;
                  return (
                    <div className="rounded-[10px] border border-border bg-card px-3 py-2 text-[12px] shadow-none">
                      <p className="font-medium text-foreground">{label}</p>
                      <p className="mt-1 tabular-nums text-muted-foreground">
                        Revenue{" "}
                        <span className="text-foreground">
                          {typeof revenue === "number"
                            ? formatMoney(revenue, currency)
                            : "—"}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#2563EB"
                strokeWidth={1.75}
                fill="url(#revenueFill)"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

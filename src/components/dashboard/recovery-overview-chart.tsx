import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useI18n } from "@/lib/i18n/locale-context";
import type { RecoveryChartPoint } from "@/lib/inbox/aggregate-recovery";
import { formatMoney } from "@/lib/money/format-money";

export function RecoveryOverviewChart({
  points,
  currency,
  periodLabel,
}: {
  points: RecoveryChartPoint[];
  currency: string;
  periodLabel: string;
}) {
  const { t, locale } = useI18n();
  const numberLocale = locale === "pt" ? "pt-PT" : "en-US";
  const recoveredLabel = t("inbox.recovery.seriesRecovered");
  const atRiskLabel = t("inbox.recovery.seriesAtRisk");
  const hasValues = points.some((point) => point.recovered > 0 || point.atRisk > 0);

  return (
    <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight text-[#0A0C10]">
          {t("inbox.recovery.overview")}
        </h2>
        <span className="inline-flex h-8 items-center rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-2.5 text-[12px] font-medium text-[#667085]">
          {periodLabel}
        </span>
      </div>

      {!hasValues ? (
        <div className="flex h-[260px] items-center justify-center text-[13px] text-[#667085]">
          {t("inbox.recovery.emptyChart")}
        </div>
      ) : (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} barGap={4} barCategoryGap="28%" margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
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
                width={52}
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat(numberLocale, {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(value)
                }
              />
              <Tooltip
                cursor={{ fill: "#F7F8FA" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-[10px] border border-[#E6E8EC] bg-white px-3 py-2 text-[12px] shadow-none">
                      <p className="font-medium text-[#0A0C10]">{label}</p>
                      {payload.map((entry) => (
                        <p key={String(entry.dataKey)} className="mt-1 tabular-nums text-[#667085]">
                          {entry.name}{" "}
                          <span className="text-[#0A0C10]">
                            {typeof entry.value === "number"
                              ? formatMoney(entry.value, currency, numberLocale)
                              : "—"}
                          </span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="top"
                align="left"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingBottom: 12, fontSize: 12, color: "#667085" }}
              />
              <Bar
                dataKey="recovered"
                name={recoveredLabel}
                fill="#2563EB"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                dataKey="atRisk"
                name={atRiskLabel}
                fill="#93C5FD"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

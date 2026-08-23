import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useT } from "@/lib/i18n/locale-context";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
} as const;

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-[18px] font-semibold">{title}</h2>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AnalyticsCharts() {
  const t = useT();

  const delivery = [
    { day: t("analytics.day.mon"), sent: 320, replied: 214 },
    { day: t("analytics.day.tue"), sent: 412, replied: 288 },
    { day: t("analytics.day.wed"), sent: 386, replied: 251 },
    { day: t("analytics.day.thu"), sent: 468, replied: 342 },
    { day: t("analytics.day.fri"), sent: 502, replied: 371 },
    { day: t("analytics.day.sat"), sent: 288, replied: 190 },
    { day: t("analytics.day.sun"), sent: 214, replied: 132 },
  ];

  const response = [
    { day: t("analytics.day.mon"), minutes: 24 },
    { day: t("analytics.day.tue"), minutes: 19 },
    { day: t("analytics.day.wed"), minutes: 22 },
    { day: t("analytics.day.thu"), minutes: 16 },
    { day: t("analytics.day.fri"), minutes: 14 },
    { day: t("analytics.day.sat"), minutes: 21 },
    { day: t("analytics.day.sun"), minutes: 27 },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title={t("analytics.chartMessages")}>
        <BarChart data={delivery}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar
            dataKey="sent"
            fill="var(--color-chart-3)"
            radius={[6, 6, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="replied"
            fill="var(--color-chart-1)"
            radius={[6, 6, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartCard>

      <ChartCard title={t("analytics.chartResponse")}>
        <AreaChart data={response}>
          <defs>
            <linearGradient id="respFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="minutes"
            stroke="var(--color-chart-1)"
            strokeWidth={2.5}
            fill="url(#respFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartCard>
    </div>
  );
}

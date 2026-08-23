import {
  eachDayOfInterval,
  format,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";

import { formatDayMonth } from "@/lib/i18n/date-locale";

import {
  getOrderStatus,
  getOrderSupply,
  type OrderStatusKey,
} from "@/lib/order-domain";

export type RecoveryEventInput = {
  statusName: string | null;
  details: string | null;
  at: string;
};

export type RecoveryOrderInput = {
  orderId: number;
  customerName: string | null;
  source: string;
  total: number | null;
  currency: string | null;
  statusName: string | null;
  details: string | null;
  lastEventAt: string | null;
  events: RecoveryEventInput[];
};

export type RecoverySupply = "dropi" | "dropea";

export type PlatformRecovery = {
  supply: RecoverySupply;
  revenue: number;
  atRisk: number;
  recovered: number;
  confirmed: number;
  workflow: number;
  rate: number | null;
};

export type RecoveredOrderRow = {
  orderId: number;
  displayId: string;
  customer: string;
  supply: RecoverySupply;
  amount: number;
  currency: string;
  lastEventAt: string | null;
};

export type RecoveryChartPoint = {
  key: string;
  label: string;
  recovered: number;
  atRisk: number;
};

export type RecoverySnapshot = {
  revenue: number;
  atRisk: number;
  recovered: number;
  confirmed: number;
  /** Classified Dropi/Dropea orders in the selected period. 0 = no real data. */
  orderCount: number;
  platforms: Record<RecoverySupply, PlatformRecovery>;
  chart: RecoveryChartPoint[];
  recent: RecoveredOrderRow[];
};

type Classified = {
  supply: RecoverySupply;
  total: number;
  currency: string;
  atRisk: boolean;
  recovered: boolean;
  enteredWorkflow: boolean;
  customer: string;
  orderId: number;
  lastEventAt: string | null;
};

const SUCCESS: ReadonlySet<OrderStatusKey> = new Set(["delivered"]);

function emptyPlatform(supply: RecoverySupply): PlatformRecovery {
  return {
    supply,
    revenue: 0,
    atRisk: 0,
    recovered: 0,
    confirmed: 0,
    workflow: 0,
    rate: null,
  };
}

export function emptyRecoverySnapshot(chartDays = 7): RecoverySnapshot {
  return {
    revenue: 0,
    atRisk: 0,
    recovered: 0,
    confirmed: 0,
    orderCount: 0,
    platforms: {
      dropi: emptyPlatform("dropi"),
      dropea: emptyPlatform("dropea"),
    },
    chart: fillChartDays([], chartDays),
    recent: [],
  };
}

function classify(order: RecoveryOrderInput): Classified | null {
  const supply = getOrderSupply({ source: order.source });
  if (supply !== "dropi" && supply !== "dropea") return null;

  const total = typeof order.total === "number" && Number.isFinite(order.total) ? order.total : 0;
  const current = getOrderStatus({
    status_name: order.statusName,
    details: order.details,
  });

  const timeline = [...order.events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  let sawMessage = current.key === "messaged";
  let sawIncident = current.key === "incident";
  let recovered = false;

  for (const event of timeline) {
    const key = getOrderStatus({
      status_name: event.statusName,
      details: event.details,
    }).key;
    if (key === "messaged") sawMessage = true;
    if (key === "incident") sawIncident = true;
    if (SUCCESS.has(key) && sawMessage) recovered = true;
  }

  if (SUCCESS.has(current.key) && sawMessage) recovered = true;

  const enteredWorkflow =
    sawMessage ||
    sawIncident ||
    current.key === "waiting" ||
    current.key === "messaged" ||
    current.key === "incident";

  return {
    supply,
    total,
    currency: order.currency?.trim() || "",
    atRisk: current.key === "incident",
    recovered,
    enteredWorkflow,
    customer: order.customerName?.trim() || "—",
    orderId: order.orderId,
    lastEventAt: order.lastEventAt,
  };
}

function chartLabel(isoDay: string) {
  const date = parseISO(isoDay);
  return formatDayMonth(date, "pt");
}

function fillChartDays(
  points: RecoveryChartPoint[],
  dayCount: number,
  fromIso?: string | null,
  toIso?: string | null,
): RecoveryChartPoint[] {
  const byKey = new Map(points.map((point) => [point.key, point]));
  const end = toIso ? startOfDay(parseISO(toIso)) : startOfDay(new Date());
  const requestedStart = fromIso
    ? startOfDay(parseISO(fromIso))
    : startOfDay(subDays(end, Math.max(dayCount, 1) - 1));
  const maxStart = startOfDay(subDays(end, 30));
  const start = requestedStart.getTime() < maxStart.getTime() ? maxStart : requestedStart;
  const safeStart = start.getTime() > end.getTime() ? end : start;

  return eachDayOfInterval({ start: safeStart, end }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return (
      byKey.get(key) ?? {
        key,
        label: chartLabel(key),
        recovered: 0,
        atRisk: 0,
      }
    );
  });
}

function rate(confirmed: number, workflow: number): number | null {
  if (workflow <= 0) return null;
  return confirmed / workflow;
}

export function aggregateRecovery(
  orders: RecoveryOrderInput[],
  range?: { from?: string | null; to?: string | null },
): RecoverySnapshot {
  const classified = orders.map(classify).filter((row): row is Classified => Boolean(row));

  const platforms: Record<RecoverySupply, PlatformRecovery> = {
    dropi: emptyPlatform("dropi"),
    dropea: emptyPlatform("dropea"),
  };

  let revenue = 0;
  let atRisk = 0;
  let recovered = 0;
  let confirmed = 0;
  const recoveredRows: RecoveredOrderRow[] = [];
  const chartMap = new Map<string, RecoveryChartPoint>();

  const bumpChart = (iso: string | null, field: "recovered" | "atRisk", amount: number) => {
    if (!iso || amount <= 0) return;
    const time = Date.parse(iso);
    if (Number.isNaN(time)) return;
    const key = format(new Date(time), "yyyy-MM-dd");
    const current = chartMap.get(key) ?? {
      key,
      label: chartLabel(key),
      recovered: 0,
      atRisk: 0,
    };
    current[field] += amount;
    chartMap.set(key, current);
  };

  for (const row of classified) {
    revenue += row.total;
    platforms[row.supply].revenue += row.total;

    if (row.atRisk) {
      atRisk += row.total;
      platforms[row.supply].atRisk += row.total;
      bumpChart(row.lastEventAt, "atRisk", row.total);
    }

    if (row.enteredWorkflow) {
      platforms[row.supply].workflow += 1;
    }

    if (row.recovered) {
      recovered += row.total;
      confirmed += 1;
      platforms[row.supply].recovered += row.total;
      platforms[row.supply].confirmed += 1;
      bumpChart(row.lastEventAt, "recovered", row.total);
      recoveredRows.push({
        orderId: row.orderId,
        displayId: `#${row.orderId}`,
        customer: row.customer,
        supply: row.supply,
        amount: row.total,
        currency: row.currency,
        lastEventAt: row.lastEventAt,
      });
    }
  }

  for (const supply of ["dropi", "dropea"] as const) {
    platforms[supply].rate = rate(platforms[supply].confirmed, platforms[supply].workflow);
  }

  recoveredRows.sort((a, b) => {
    const aTime = a.lastEventAt ? Date.parse(a.lastEventAt) : 0;
    const bTime = b.lastEventAt ? Date.parse(b.lastEventAt) : 0;
    return bTime - aTime;
  });

  return {
    revenue,
    atRisk,
    recovered,
    confirmed,
    orderCount: classified.length,
    platforms,
    chart: fillChartDays(
      [...chartMap.values()],
      7,
      range?.from ?? null,
      range?.to ?? null,
    ),
    recent: recoveredRows.slice(0, 8),
  };
}

export function formatRecoveryRate(value: number | null, locale = "pt-PT"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0 || name === "—") return "?";
  const firstWord = parts[0];
  if (!firstWord) return "?";
  if (parts.length === 1) return firstWord.slice(0, 2).toUpperCase();
  const lastWord = parts[parts.length - 1];
  const first = firstWord[0] ?? "";
  const last = lastWord?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

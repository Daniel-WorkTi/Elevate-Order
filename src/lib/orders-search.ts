import { z } from "zod";
import { endOfDay, startOfDay, subDays } from "date-fns";

import { PAGE_SIZES, type PageSize, type Supply } from "@/lib/order-domain";
import type { OrdersQueryInput } from "@/lib/synced-orders.functions";

export const ordersSearchSchema = z.object({
  supply: z.enum(["dropi", "dropea", "shopify"]).catch("dropi"),
  q: z.string().optional(),
  status: z.string().optional(),
  country: z.string().optional(),
  date: z.enum(["today", "7d", "30d", "custom"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  shipping: z.string().optional(),
  tracking: z.enum(["yes", "no"]).optional(),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .catch(25)
    .transform((value): PageSize =>
      (PAGE_SIZES as readonly number[]).includes(value) ? (value as PageSize) : 25,
    ),
  sort: z.enum(["last_event_at", "total", "status_name", "order_id"]).catch("last_event_at"),
  dir: z.enum(["asc", "desc"]).catch("desc"),
});

export type OrdersSearch = z.infer<typeof ordersSearchSchema>;

export function dateRangeFromSearch(search: Pick<OrdersSearch, "date" | "from" | "to">): {
  from?: string;
  to?: string;
} {
  const now = new Date();

  if (search.date === "today") {
    return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
  }
  if (search.date === "7d") {
    return { from: subDays(now, 7).toISOString(), to: now.toISOString() };
  }
  if (search.date === "30d") {
    return { from: subDays(now, 30).toISOString(), to: now.toISOString() };
  }

  const range: { from?: string; to?: string } = {};
  if (search.from) range.from = search.from;
  if (search.to) range.to = search.to;
  return range;
}

export function searchToQuery(search: OrdersSearch): OrdersQueryInput {
  const range = dateRangeFromSearch(search);
  const query: OrdersQueryInput = {
    supply: search.supply,
    page: search.page,
    pageSize: search.pageSize,
    sort: search.sort,
    dir: search.dir,
  };

  const q = search.q?.trim();
  if (q) query.search = q;
  if (search.status) query.status = search.status;
  if (search.country) query.country = search.country;
  if (range.from) query.from = range.from;
  if (range.to) query.to = range.to;
  if (search.shipping) query.shipping = search.shipping;
  if (search.tracking) query.hasTracking = search.tracking;

  return query;
}

export function hasActiveFilters(search: OrdersSearch): boolean {
  return Boolean(
    search.q?.trim() ||
    search.status ||
    search.country ||
    search.date ||
    search.from ||
    search.to ||
    search.shipping ||
    search.tracking,
  );
}

export function clearFiltersSearch(search: OrdersSearch): OrdersSearch {
  return {
    supply: search.supply,
    page: 1,
    pageSize: search.pageSize,
    sort: search.sort,
    dir: search.dir,
  };
}

export function withSupply(search: OrdersSearch, supply: Supply): OrdersSearch {
  return { ...search, supply, page: 1 };
}

export const DATE_PRESET_LABEL: Record<NonNullable<OrdersSearch["date"]>, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  custom: "Custom",
};

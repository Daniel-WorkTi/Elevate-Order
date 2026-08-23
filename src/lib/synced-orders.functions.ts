import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ORDER_SORT_FIELDS,
  PAGE_SIZES,
  type OperationalOrder,
  type OrderSortField,
  type PageSize,
  type Supply,
} from "@/lib/order-domain";

export type SyncedOrder = {
  order_id: number;
  shopify_order_id: number | null;
  status_id: number | null;
  status_name: string | null;
  details: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  shipping_company: string | null;
  total: number | null;
  source: string;
  last_event_at: string | null;
};

const ORDER_COLUMNS_FULL =
  "id, order_id, shopify_order_id, status_id, status_name, details, tracking_code, tracking_url, shipping_company, total, currency, customer_name, phone, country, city, postal_code, address, product_summary, source, last_event_at, created_at";

const ORDER_COLUMNS_LEGACY =
  "id, order_id, shopify_order_id, status_id, status_name, details, tracking_code, tracking_url, shipping_company, total, source, last_event_at, created_at";

function isMissingColumnError(error: { message?: string } | null | undefined) {
  return /column|schema cache|does not exist/i.test(error?.message ?? "");
}

export type OrdersQueryInput = {
  supply: Supply;
  search?: string | undefined;
  status?: string | undefined;
  country?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  shipping?: string | undefined;
  hasTracking?: "yes" | "no" | undefined;
  page: number;
  pageSize: PageSize;
  sort: OrderSortField;
  dir: "asc" | "desc";
};

export type OrdersQueryResult = {
  orders: OperationalOrder[];
  total: number;
  page: number;
  pageSize: PageSize;
  pageCount: number;
  facets: {
    statuses: string[];
    shippingCompanies: string[];
    countries: string[];
  };
  error: string | null;
};

type OrdersRow = {
  id: string;
  order_id: number;
  shopify_order_id: number | null;
  status_id: number | null;
  status_name: string | null;
  details: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  shipping_company: string | null;
  total: number | string | null;
  currency: string | null;
  customer_name: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  product_summary: string | null;
  source: string;
  last_event_at: string | null;
  created_at: string | null;
};

function asNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapOrder(row: OrdersRow): OperationalOrder {
  return {
    id: row.id,
    order_id: row.order_id,
    shopify_order_id: row.shopify_order_id,
    status_id: row.status_id,
    status_name: row.status_name,
    details: row.details,
    tracking_code: row.tracking_code,
    tracking_url: row.tracking_url,
    shipping_company: row.shipping_company,
    total: asNumber(row.total),
    currency: row.currency ?? null,
    customer_name: row.customer_name ?? null,
    phone: row.phone ?? null,
    country: row.country ?? null,
    source: row.source,
    last_event_at: row.last_event_at,
    created_at: row.created_at,
    product_summary: row.product_summary ?? null,
  };
}

function sanitizeSearch(value: string): string {
  return value
    .replace(/[%_,()]/g, " ")
    .trim()
    .slice(0, 80);
}

function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZES as readonly number[]).includes(value);
}

function isSortField(value: string): value is OrderSortField {
  return (ORDER_SORT_FIELDS as readonly string[]).includes(value);
}

function parseSupply(value: unknown): Supply {
  if (value === "dropea") return "dropea";
  if (value === "shopify") return "shopify";
  return "dropi";
}

export function parseOrdersQuery(data: unknown): OrdersQueryInput {
  const raw = (data ?? {}) as Record<string, unknown>;
  const pageRaw = typeof raw["page"] === "number" ? raw["page"] : Number(raw["page"]);
  const pageSizeRaw =
    typeof raw["pageSize"] === "number" ? raw["pageSize"] : Number(raw["pageSize"]);
  const sortRaw = typeof raw["sort"] === "string" ? raw["sort"] : "last_event_at";
  const dirRaw = raw["dir"] === "asc" ? "asc" : "desc";
  const hasTracking =
    raw["hasTracking"] === "yes" || raw["hasTracking"] === "no" ? raw["hasTracking"] : undefined;

  const parsed: OrdersQueryInput = {
    supply: parseSupply(raw["supply"]),
    page: Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    pageSize: isPageSize(pageSizeRaw) ? pageSizeRaw : 25,
    sort: isSortField(sortRaw) ? sortRaw : "last_event_at",
    dir: dirRaw,
  };

  const search = typeof raw["search"] === "string" ? raw["search"].trim() : "";
  if (search) parsed.search = search;

  const status = typeof raw["status"] === "string" ? raw["status"].trim() : "";
  if (status) parsed.status = status;

  const country = typeof raw["country"] === "string" ? raw["country"].trim() : "";
  if (country) parsed.country = country;

  const from = typeof raw["from"] === "string" ? raw["from"].trim() : "";
  if (from) parsed.from = from;

  const to = typeof raw["to"] === "string" ? raw["to"].trim() : "";
  if (to) parsed.to = to;

  const shipping = typeof raw["shipping"] === "string" ? raw["shipping"].trim() : "";
  if (shipping) parsed.shipping = shipping;

  if (hasTracking) parsed.hasTracking = hasTracking;

  return parsed;
}

function applySupplyFilter<
  T extends {
    ilike: (column: string, pattern: string) => T;
    not: (column: string, operator: string, value: string) => T;
  },
>(query: T, supply: Supply): T {
  if (supply === "dropea") return query.ilike("source", "%dropea%");
  if (supply === "shopify") return query.ilike("source", "%shopify%");
  return query
    .ilike("source", "%dropi%")
    .not("source", "ilike", "%dropea%")
    .not("source", "ilike", "%shopify%");
}

function applyDateFilter<
  T extends {
    gte: (column: string, value: string) => T;
    lte: (column: string, value: string) => T;
  },
>(query: T, from?: string, to?: string): T {
  let next = query;
  if (from) next = next.gte("last_event_at", from);
  if (to) next = next.lte("last_event_at", to);
  return next;
}

function applySearchFilter<T extends { or: (filters: string) => T }>(query: T, search?: string): T {
  if (!search) return query;
  const sanitized = sanitizeSearch(search);
  if (!sanitized) return query;

  const numeric = Number(sanitized);
  if (Number.isInteger(numeric) && numeric > 0) {
    return query.or(
      `order_id.eq.${numeric},shopify_order_id.eq.${numeric},tracking_code.ilike.%${sanitized}%`,
    );
  }

  return query.or(
    `tracking_code.ilike.%${sanitized}%,status_name.ilike.%${sanitized}%,shipping_company.ilike.%${sanitized}%,details.ilike.%${sanitized}%,customer_name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%,product_summary.ilike.%${sanitized}%`,
  );
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function emptyResult(error: string | null, input: OrdersQueryInput): OrdersQueryResult {
  return {
    orders: [],
    total: 0,
    page: input.page,
    pageSize: input.pageSize,
    pageCount: 1,
    facets: { statuses: [], shippingCompanies: [], countries: [] },
    error,
  };
}

function syncedOrdersErrorMessage(error: unknown): string {
  const text =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message)
      : error instanceof Error
        ? error.message
        : "";

  if (/Missing Supabase environment variable/i.test(text)) {
    return "Falta configurar as chaves do Supabase no .env. Reinicie o servidor depois de salvar.";
  }
  if (/Could not find the table|relation .* does not exist|schema cache/i.test(text)) {
    return "As tabelas orders ainda não existem neste projeto. Rode a migration no SQL Editor do Supabase.";
  }
  return "Não foi possível carregar os pedidos sincronizados.";
}

export const listSyncedOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "order_id, shopify_order_id, status_id, status_name, details, tracking_code, tracking_url, shipping_company, total, source, last_event_at",
      )
        .order("last_event_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("listSyncedOrders failed", error);
      return { orders: [] as SyncedOrder[], error: syncedOrdersErrorMessage(error) };
    }

    return { orders: (data ?? []) as SyncedOrder[], error: null as string | null };
  } catch (error) {
    console.error("listSyncedOrders failed", error);
    return { orders: [] as SyncedOrder[], error: syncedOrdersErrorMessage(error) };
  }
});

export const querySyncedOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => parseOrdersQuery(data))
  .handler(async ({ data }): Promise<OrdersQueryResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const applyBase = <Q>(query: Q) => {
        let next = applySupplyFilter(query as never, data.supply) as Q;
        next = applyDateFilter(next as never, data.from, data.to) as Q;
        next = applySearchFilter(next as never, data.search) as Q;
        return next;
      };

      const applyListFilters = <
        Q extends {
          eq: (column: string, value: string) => Q;
          not: (column: string, op: string, value: null) => Q;
          is: (column: string, value: null) => Q;
        },
      >(
        query: Q,
      ) => {
        let next = applyBase(query);
        if (data.status) next = next.eq("status_name", data.status);
        if (data.shipping) next = next.eq("shipping_company", data.shipping);
        if (data.hasTracking === "yes") next = next.not("tracking_code", "is", null);
        if (data.hasTracking === "no") next = next.is("tracking_code", null);
        return next;
      };

      let listQuery = applyListFilters(
        supabaseAdmin.from("orders").select(ORDER_COLUMNS_FULL, { count: "exact" }),
      );

      listQuery = listQuery.order(data.sort, {
        ascending: data.dir === "asc",
        nullsFirst: false,
      });

      const from = (data.page - 1) * data.pageSize;
      const to = from + data.pageSize - 1;
      let { data: rows, error, count } = await listQuery.range(from, to);

      if (error && isMissingColumnError(error)) {
        listQuery = applyListFilters(
          supabaseAdmin.from("orders").select(ORDER_COLUMNS_LEGACY, { count: "exact" }),
        );
        listQuery = listQuery.order(data.sort, {
          ascending: data.dir === "asc",
          nullsFirst: false,
        });
        ({ data: rows, error, count } = await listQuery.range(from, to));
      }

      if (error) {
        console.error("querySyncedOrders failed", error);
        return emptyResult("Unable to load orders.", data);
      }

      const total = count ?? 0;
      const pageCount = Math.max(1, Math.ceil(total / data.pageSize));

      const facetBase = applyBase(
        supabaseAdmin.from("orders").select("status_name, shipping_company"),
      );
      const { data: facetRows } = await facetBase.limit(2000);

      const orders = ((rows ?? []) as OrdersRow[]).map(mapOrder);

      return {
        orders,
        total,
        page: data.page,
        pageSize: data.pageSize,
        pageCount,
        facets: {
          statuses: uniqueSorted((facetRows ?? []).map((row) => row.status_name)),
          shippingCompanies: uniqueSorted((facetRows ?? []).map((row) => row.shipping_company)),
          countries: uniqueSorted(orders.map((order) => order.country)),
        },
        error: null,
      };
    } catch (error) {
      console.error("querySyncedOrders failed", error);
      const message =
        error instanceof Error && /Missing Supabase environment variable/i.test(error.message)
          ? "Unable to load orders. Check the connection."
          : "Unable to load orders.";
      return emptyResult(message, parseOrdersQuery(data));
    }
  });

export const getSyncedOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => {
    const raw = (data ?? {}) as Record<string, unknown>;
    const orderId = typeof raw["orderId"] === "number" ? raw["orderId"] : Number(raw["orderId"]);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new Error("Invalid order id");
    }
    return { orderId };
  })
  .handler(async ({ data }): Promise<{ order: OperationalOrder | null; error: string | null }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("orders")
        .select(ORDER_COLUMNS_FULL)
        .eq("order_id", data.orderId)
        .maybeSingle();

      if (error && isMissingColumnError(error)) {
        const fallback = await supabaseAdmin
          .from("orders")
          .select(ORDER_COLUMNS_LEGACY)
          .eq("order_id", data.orderId)
          .maybeSingle();
        if (fallback.error) {
          console.error("getSyncedOrder failed", fallback.error);
          return { order: null, error: "Unable to load this order." };
        }
        if (!fallback.data) return { order: null, error: null };
        return { order: mapOrder(fallback.data as OrdersRow), error: null };
      }

      if (error) {
        console.error("getSyncedOrder failed", error);
        return { order: null, error: "Unable to load this order." };
      }

      if (!row) return { order: null, error: null };

      return { order: mapOrder(row as OrdersRow), error: null };
    } catch (error) {
      console.error("getSyncedOrder failed", error);
      return { order: null, error: "Unable to load this order." };
    }
  });

export type OrderEventRow = {
  id: string;
  order_id: number;
  event_date: string;
  status_id: number | null;
  status_name: string | null;
  details: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  shipping_company: string | null;
  total: number | null;
  source: string;
  created_at: string;
};

export const listOrderEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => {
    const raw = (data ?? {}) as Record<string, unknown>;
    const orderId = typeof raw["orderId"] === "number" ? raw["orderId"] : Number(raw["orderId"]);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new Error("Invalid order id");
    }
    return { orderId };
  })
  .handler(async ({ data }): Promise<{ events: OrderEventRow[]; error: string | null }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin
        .from("order_events")
        .select(
          "id, order_id, event_date, status_id, status_name, details, tracking_code, tracking_url, shipping_company, total, source, created_at",
        )
        .eq("order_id", data.orderId)
        .order("event_date", { ascending: true });

      if (error) {
        console.error("listOrderEvents failed", error);
        return { events: [], error: "Unable to load timeline." };
      }

      return { events: (rows ?? []) as OrderEventRow[], error: null };
    } catch (error) {
      console.error("listOrderEvents failed", error);
      return { events: [], error: "Unable to load timeline." };
    }
  });

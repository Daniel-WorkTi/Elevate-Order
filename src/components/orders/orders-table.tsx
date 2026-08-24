import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";

import { MobileOrderRow } from "@/components/orders/mobile-order-row";
import { useOrdersColumns, type OrdersTableMeta } from "@/components/orders/orders-columns";
import { OrdersEmptyState } from "@/components/orders/orders-empty-state";
import { OrdersPagination } from "@/components/orders/orders-pagination";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT } from "@/lib/i18n/locale-context";
import { SUPPLY_LABEL, type PageSize } from "@/lib/order-domain";
import { clearFiltersSearch, hasActiveFilters, type OrdersSearch } from "@/lib/orders-search";
import type { OperationalOrder } from "@/lib/order-domain";

export function OrdersTable({
  orders,
  search,
  total,
  pageCount,
  fx,
  error,
  onRetry,
  onSearchChange,
}: {
  orders: OperationalOrder[];
  search: OrdersSearch;
  total: number;
  pageCount: number;
  fx?: { to: string; rateMap: Record<string, number> } | undefined;
  error: string | null;
  onRetry: () => void;
  onSearchChange: (next: OrdersSearch) => void;
}) {
  const t = useT();
  const columns = useOrdersColumns();

  const sorting = useMemo<SortingState>(
    () => [{ id: search.sort, desc: search.dir === "desc" }],
    [search.sort, search.dir],
  );
  const meta = useMemo<OrdersTableMeta>(() => ({ ...(fx ? { fx } : {}) }), [fx]);
  const filtered = hasActiveFilters(search);

  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount,
    rowCount: total,
    meta,
    onSortingChange: (updater: Updater<SortingState>) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      const sort =
        first &&
        (first.id === "order_id" ||
          first.id === "total" ||
          first.id === "status_name" ||
          first.id === "last_event_at")
          ? first.id
          : "last_event_at";
      onSearchChange({
        ...search,
        sort,
        dir: first?.desc === false ? "asc" : "desc",
        page: 1,
      });
    },
  });

  if (error) {
    return (
      <div className="overflow-hidden rounded-[16px] border border-border bg-card">
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-[15px] font-medium text-foreground">
            {t("orders.loadErrorSupply", { supply: SUPPLY_LABEL[search.supply] })}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">{error}</p>
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              onClick={onRetry}
              className="h-9 rounded-[10px] text-[13px] shadow-none"
            >
              {t("common.retry")}
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-9 rounded-[10px] border-border text-[13px] shadow-none"
            >
              <Link
                to={
                  search.supply === "shopify"
                    ? "/connections/shopify"
                    : search.supply === "dropea"
                      ? "/connections/dropea"
                      : "/connections/dropi"
                }
              >
                {t("orders.checkConnection")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[16px] border border-border bg-card">
      <div className="hidden md:block">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="h-11 border-border hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-11 px-4 whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <OrdersEmptyState
                    supply={search.supply}
                    filtered={filtered}
                    onClearFilters={() => onSearchChange(clearFiltersSearch(search))}
                  />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="h-[60px] border-border hover:bg-[color:var(--elevate-blue-soft)]/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {orders.length === 0 ? (
          <OrdersEmptyState
            supply={search.supply}
            filtered={filtered}
            onClearFilters={() => onSearchChange(clearFiltersSearch(search))}
          />
        ) : (
          orders.map((order) => <MobileOrderRow key={order.id} order={order} fx={fx} />)
        )}
      </div>

      {total > 0 ? (
        <div className="border-t border-border">
          <OrdersPagination
            page={search.page}
            pageSize={search.pageSize}
            total={total}
            pageCount={pageCount}
            onPageChange={(page) => onSearchChange({ ...search, page })}
            onPageSizeChange={(pageSize: PageSize) =>
              onSearchChange({ ...search, pageSize, page: 1 })
            }
          />
        </div>
      ) : null}
    </div>
  );
}

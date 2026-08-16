import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/money/format-money";
import { convertMoney } from "@/lib/money/format-money";
import { SupplyName } from "@/components/supply-logo";
import type { OrderFinancials } from "@/lib/profits/normalize-order-financials";
import { formatRelativeTimestamp } from "@/lib/format-relative-time";

type RowView = {
  order: OrderFinancials;
  revenueDisplay: string;
  costsDisplay: string;
  feesDisplay: string;
  profitDisplay: string;
  currency: string;
};

export function ProfitsTable({
  orders,
  displayCurrency,
  rateMap,
  costsAvailable,
  feesAvailable,
}: {
  orders: OrderFinancials[];
  displayCurrency: string;
  rateMap: Record<string, number>;
  costsAvailable: boolean;
  feesAvailable: boolean;
}) {
  const rows = useMemo<RowView[]>(() => {
    return orders.map((order) => {
      const revenue =
        order.revenue == null
          ? null
          : convertMoney({
              amount: order.revenue.amount,
              fromCurrency: order.revenue.currency,
              toCurrency: displayCurrency,
              rateMap,
            });
      return {
        order,
        revenueDisplay: formatMoney(revenue, displayCurrency),
        costsDisplay: costsAvailable
          ? formatMoney(
              order.knownCosts
                ? convertMoney({
                    amount: order.knownCosts.amount,
                    fromCurrency: order.knownCosts.currency,
                    toCurrency: displayCurrency,
                    rateMap,
                  })
                : null,
              displayCurrency,
            )
          : "—",
        feesDisplay: feesAvailable
          ? formatMoney(
              order.fees
                ? convertMoney({
                    amount: order.fees.amount,
                    fromCurrency: order.fees.currency,
                    toCurrency: displayCurrency,
                    rateMap,
                  })
                : null,
              displayCurrency,
            )
          : "—",
        profitDisplay:
          costsAvailable && order.profit
            ? formatMoney(
                convertMoney({
                  amount: order.profit.amount,
                  fromCurrency: order.profit.currency,
                  toCurrency: displayCurrency,
                  rateMap,
                }),
                displayCurrency,
              )
            : "Unavailable",
        currency: order.revenue?.currency ?? "EUR",
      };
    });
  }, [orders, displayCurrency, rateMap, costsAvailable, feesAvailable]);

  const columns = useMemo<ColumnDef<RowView>[]>(
    () => [
      {
        id: "order",
        header: "Order",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">{row.original.order.orderLabel}</span>
        ),
      },
      {
        id: "supply",
        header: "Supply",
        cell: ({ row }) => {
          const supply = row.original.order.supply;
          return supply ? (
            <SupplyName supply={supply} className="text-[12px] font-medium" />
          ) : (
            <span className="text-muted-foreground">{row.original.order.source}</span>
          );
        },
      },
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => {
          const stamp = formatRelativeTimestamp(row.original.order.date);
          return (
            <span className="text-muted-foreground" title={stamp?.exact}>
              {stamp?.exact ?? "—"}
            </span>
          );
        },
      },
      {
        id: "revenue",
        header: () => <span className="block text-right">Revenue</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">{row.original.revenueDisplay}</span>
        ),
      },
      {
        id: "costs",
        header: () => <span className="block text-right">Known costs</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums text-muted-foreground">
            {row.original.costsDisplay}
          </span>
        ),
      },
      {
        id: "fees",
        header: () => <span className="block text-right">Fees</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums text-muted-foreground">
            {row.original.feesDisplay}
          </span>
        ),
      },
      {
        id: "profit",
        header: () => <span className="block text-right">Profit</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">{row.original.profitDisplay}</span>
        ),
      },
      {
        id: "currency",
        header: "Currency",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">{row.original.currency}</span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <section className="rounded-[16px] border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Orders</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {orders.length} synchronized order{orders.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => (
                  <TableHead key={header.id} className="h-10 text-[12px] text-muted-foreground">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3 text-[13px]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 p-3 md:hidden">
        {table.getRowModel().rows.map((row) => {
          const item = row.original;
          return (
            <div key={row.id} className="rounded-[12px] border border-border px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium tabular-nums">{item.order.orderLabel}</p>
                {item.order.supply ? (
                  <SupplyName
                    supply={item.order.supply}
                    className="text-[11px] text-muted-foreground"
                  />
                ) : null}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                <div>
                  <dt className="text-muted-foreground">Revenue</dt>
                  <dd className="tabular-nums">{item.revenueDisplay}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Costs</dt>
                  <dd className="tabular-nums">{item.costsDisplay}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Profit</dt>
                  <dd className="tabular-nums">{item.profitDisplay}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        <p className="text-[12px] text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-[8px] text-[12px] shadow-none"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-[8px] text-[12px] shadow-none"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}

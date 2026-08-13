import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Copy,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTimestamp } from "@/lib/format-relative-time";
import {
  formatConvertedTotal,
  formatOrderId,
  formatOrderTotal,
  safeTrackingHref,
  type OperationalOrder,
} from "@/lib/order-domain";
import { cn } from "@/lib/utils";

export type OrdersTableMeta = {
  fx?: { to: string; rate: number | null };
};

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <ArrowUp className="size-3" strokeWidth={1.5} />;
  if (direction === "desc") return <ArrowDown className="size-3" strokeWidth={1.5} />;
  return <ArrowUpDown className="size-3 opacity-40" strokeWidth={1.5} />;
}

function SortHeader({
  label,
  column,
}: {
  label: string;
  column: {
    getIsSorted: () => false | "asc" | "desc";
    toggleSorting: (desc?: boolean) => void;
  };
}) {
  const direction = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(direction === "asc")}
      className="inline-flex items-center gap-1 text-[12px] font-medium tracking-wide text-muted-foreground uppercase"
    >
      {label}
      <SortIcon direction={direction} />
    </button>
  );
}

export const ordersColumns: ColumnDef<OperationalOrder>[] = [
  {
    id: "order_id",
    accessorKey: "order_id",
    header: ({ column }) => <SortHeader label="Order" column={column} />,
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div className="min-w-0">
          <p className="text-[13px] font-semibold tracking-tight text-foreground">
            {formatOrderId(order)}
          </p>
          {order.shopify_order_id ? (
            <p className="text-[12px] text-muted-foreground">Shopify #{order.shopify_order_id}</p>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "customer",
    accessorFn: (order) => order.customer_name ?? "",
    enableSorting: false,
    header: () => (
      <span className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
        Customer
      </span>
    ),
    cell: ({ row }) => {
      const order = row.original;
      const secondary = order.country ?? order.phone;
      return (
        <div className="min-w-0">
          <p className="truncate text-[13px] text-foreground">{order.customer_name ?? "—"}</p>
          {secondary ? (
            <p className="hidden truncate text-[12px] text-muted-foreground md:block">
              {secondary}
            </p>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "status_name",
    accessorKey: "status_name",
    header: ({ column }) => <SortHeader label="Status" column={column} />,
    cell: ({ row }) => <OrderStatusBadge order={row.original} />,
  },
  {
    id: "total",
    accessorKey: "total",
    header: ({ column }) => <SortHeader label="Total" column={column} />,
    cell: ({ row, table }) => {
      const order = row.original;
      const fx = (table.options.meta as OrdersTableMeta | undefined)?.fx;
      const total = formatOrderTotal(order);
      const converted = fx ? formatConvertedTotal(order, fx.to, fx.rate) : null;
      return (
        <div className="tabular-nums">
          <p className="text-[13px] font-semibold text-foreground">{total ?? "—"}</p>
          {converted ? <p className="text-[11px] text-muted-foreground">≈ {converted}</p> : null}
        </div>
      );
    },
  },
  {
    id: "shipping",
    accessorKey: "shipping_company",
    enableSorting: false,
    header: () => (
      <span className="hidden text-[12px] font-medium tracking-wide text-muted-foreground uppercase lg:inline">
        Shipping
      </span>
    ),
    cell: ({ row }) => (
      <span className="hidden text-[13px] text-foreground lg:inline">
        {row.original.shipping_company ?? "—"}
      </span>
    ),
  },
  {
    id: "tracking",
    accessorKey: "tracking_code",
    enableSorting: false,
    header: () => (
      <span className="hidden text-[12px] font-medium tracking-wide text-muted-foreground uppercase md:inline">
        Tracking
      </span>
    ),
    cell: ({ row }) => {
      const code = row.original.tracking_code?.trim() || null;
      const href = safeTrackingHref(row.original.tracking_url);
      if (!code)
        return <span className="hidden text-[13px] text-muted-foreground md:inline">—</span>;
      if (!href) {
        return (
          <span className="hidden font-mono text-[12px] text-foreground md:inline">{code}</span>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="hidden font-mono text-[12px] text-foreground underline-offset-2 hover:underline md:inline"
        >
          {code}
        </a>
      );
    },
  },
  {
    id: "last_event_at",
    accessorKey: "last_event_at",
    header: ({ column }) => (
      <span className="hidden lg:inline">
        <SortHeader label="Last update" column={column} />
      </span>
    ),
    cell: ({ row }) => {
      const updated = formatRelativeTimestamp(row.original.last_event_at);
      if (!updated)
        return <span className="hidden text-[13px] text-muted-foreground lg:inline">—</span>;
      return (
        <time
          className="hidden text-[13px] text-muted-foreground lg:inline"
          dateTime={row.original.last_event_at ?? undefined}
          title={updated.exact}
        >
          {updated.relative}
        </time>
      );
    },
  },
  {
    id: "action",
    enableSorting: false,
    header: () => <span className="sr-only">Action</span>,
    cell: ({ row }) => {
      const order = row.original;
      const trackingHref = safeTrackingHref(order.tracking_url);

      return (
        <div className="flex items-center justify-end gap-1">
          <Link
            to="/orders/$id"
            params={{ id: String(order.order_id) }}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-[13px] font-medium",
              "text-[color:var(--elevate-blue)] hover:text-[color:var(--elevate-blue-hover)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40",
            )}
          >
            Open
            <ArrowRight className="size-3.5" strokeWidth={1.5} />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-[8px]"
                aria-label={`More actions for ${formatOrderId(order)}`}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="size-4" strokeWidth={1.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-[10px]">
              <DropdownMenuItem asChild>
                <Link to="/orders/$id" params={{ id: String(order.order_id) }}>
                  Open
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(String(order.order_id));
                  } catch {
                    /* clipboard may be unavailable */
                  }
                }}
              >
                <Copy className="size-3.5" strokeWidth={1.5} />
                Copy order ID
              </DropdownMenuItem>
              {trackingHref ? (
                <DropdownMenuItem asChild>
                  <a href={trackingHref} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" strokeWidth={1.5} />
                    Open tracking
                  </a>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

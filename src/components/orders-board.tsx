import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, PackageOpen } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderCard } from "@/components/order-card";
import { OrderDetailDialog } from "@/components/order-detail-dialog";
import { orders as allOrders, statusMeta, type Order, type OrderStatus } from "@/lib/orders";

const tabs: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "confirmed", label: statusMeta.confirmed.label },
  { value: "messaged", label: statusMeta.messaged.label },
  { value: "unanswered", label: statusMeta.unanswered.label },
  { value: "incident", label: statusMeta.incident.label },
];

export function OrdersBoard({ loading = false }: { loading?: boolean }) {
  const [tab, setTab] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("7");
  const [selected, setSelected] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allOrders.filter((order) => {
      const matchesTab = tab === "all" || order.status === tab;
      const matchesQuery =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.customer.toLowerCase().includes(q) ||
        order.postalCode.toLowerCase().includes(q);
      return matchesTab && matchesQuery;
    });
  }, [tab, query]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl bg-secondary p-1">
            {tabs.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="rounded-lg px-3 text-sm">
                {item.label}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {item.value === "all"
                    ? allOrders.length
                    : allOrders.filter((o) => o.status === item.value).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-1 items-center gap-2 lg:max-w-md">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Order ID, customer or postal code"
              className="h-10 rounded-xl bg-card pl-9"
              aria-label="Search orders"
            />
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-10 w-36 rounded-xl bg-card" aria-label="Date range">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-14 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-secondary">
            <PackageOpen className="size-7 text-primary" />
          </span>
          <h3 className="mt-4 text-lg font-semibold">No orders match this view</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Try a different status tab or clear the search. New orders sync automatically from Dropi
            Pro and Dropea every few minutes.
          </p>
        </div>
      ) : (
        <div className="grid animate-fade-in gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} onOpen={setSelected} />
          ))}
        </div>
      )}

      <OrderDetailDialog order={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </section>
  );
}

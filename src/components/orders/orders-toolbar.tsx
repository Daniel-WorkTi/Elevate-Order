import { useEffect, useRef, useState, forwardRef, type ComponentProps } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { endOfDay, format } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DATE_PRESET_LABEL, hasActiveFilters, type OrdersSearch } from "@/lib/orders-search";
import { cn } from "@/lib/utils";

const filterButtonClass =
  "h-10 rounded-[10px] border border-border bg-card px-3 text-[13px] font-medium shadow-none hover:bg-muted/40";

const filterActiveClass =
  "border-[color:var(--elevate-blue)]/25 bg-[color:var(--elevate-blue-soft)] text-[color:var(--elevate-blue)] hover:bg-[color:var(--elevate-blue-soft)]";

const FilterButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button"> & { label: string; active: boolean }
>(function FilterButton({ label, active, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        filterButtonClass,
        "inline-flex items-center gap-1.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40",
        active && filterActiveClass,
        className,
      )}
      {...props}
    >
      {label}
      <ChevronDown className="size-3.5 opacity-60" strokeWidth={1.5} />
    </button>
  );
});

export function OrdersToolbar({
  search,
  facets,
  onChange,
}: {
  search: OrdersSearch;
  facets: { statuses: string[]; shippingCompanies: string[]; countries: string[] };
  onChange: (next: OrdersSearch) => void;
}) {
  const [query, setQuery] = useState(search.q ?? "");
  const [dateOpen, setDateOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    if (!search.from) return undefined;
    if (search.to) return { from: new Date(search.from), to: new Date(search.to) };
    return { from: new Date(search.from) };
  });
  const searchRef = useRef(search);
  const onChangeRef = useRef(onChange);
  searchRef.current = search;
  onChangeRef.current = onChange;

  useEffect(() => {
    setQuery(search.q ?? "");
  }, [search.q]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = query.trim();
      const current = searchRef.current.q?.trim() ?? "";
      if (next === current) return;
      const updated: OrdersSearch = { ...searchRef.current, page: 1 };
      if (next) updated.q = next;
      else delete updated.q;
      onChangeRef.current(updated);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  const patch = (partial: Partial<OrdersSearch>, unset: Array<keyof OrdersSearch> = []) => {
    const next: OrdersSearch = { ...search, ...partial, page: 1 };
    for (const key of unset) {
      delete next[key];
    }
    onChange(next);
  };

  const dateLabel = search.date
    ? search.date === "custom" && search.from
      ? `${format(new Date(search.from), "d MMM")}${search.to ? ` – ${format(new Date(search.to), "d MMM")}` : ""}`
      : DATE_PRESET_LABEL[search.date]
    : "Date";

  const moreCount = Number(Boolean(search.shipping)) + Number(Boolean(search.tracking));

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.5}
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search order ID, Shopify ID or tracking..."
          aria-label="Search orders"
          className="h-10 rounded-[10px] border-border bg-card pl-9 text-[13px] shadow-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterButton
              label={search.status ?? "Status"}
              active={Boolean(search.status)}
              aria-label="Filter by status"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-72 w-52 overflow-y-auto rounded-[10px]"
          >
            <DropdownMenuItem onClick={() => patch({}, ["status"])}>All statuses</DropdownMenuItem>
            <DropdownMenuSeparator />
            {facets.statuses.length === 0 ? (
              <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
                No statuses in this supply yet.
              </p>
            ) : (
              facets.statuses.map((status) => (
                <DropdownMenuItem key={status} onClick={() => patch({ status })}>
                  {search.status === status ? <Check className="size-3.5" /> : null}
                  {status}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {facets.countries.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <FilterButton
                label={search.country ?? "Country"}
                active={Boolean(search.country)}
                aria-label="Filter by country"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-72 w-48 overflow-y-auto rounded-[10px]"
            >
              <DropdownMenuItem onClick={() => patch({}, ["country"])}>
                All countries
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {facets.countries.map((country) => (
                <DropdownMenuItem key={country} onClick={() => patch({ country })}>
                  {search.country === country ? <Check className="size-3.5" /> : null}
                  {country}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <FilterButton
              label={dateLabel}
              active={Boolean(search.date || search.from)}
              aria-label="Filter by date"
            />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto rounded-[12px] p-3">
            <div className="mb-3 flex flex-col gap-1">
              <Button
                type="button"
                variant="ghost"
                className="h-8 justify-start rounded-[8px] text-[13px]"
                onClick={() => {
                  patch({ date: "today" }, ["from", "to"]);
                  setDateOpen(false);
                }}
              >
                Today
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-8 justify-start rounded-[8px] text-[13px]"
                onClick={() => {
                  patch({ date: "7d" }, ["from", "to"]);
                  setDateOpen(false);
                }}
              >
                Last 7 days
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-8 justify-start rounded-[8px] text-[13px]"
                onClick={() => {
                  patch({ date: "30d" }, ["from", "to"]);
                  setDateOpen(false);
                }}
              >
                Last 30 days
              </Button>
            </div>
            <Calendar mode="range" selected={range} onSelect={setRange} />
            <div className="mt-3 flex justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-8 rounded-[8px] text-[12px]"
                onClick={() => {
                  patch({}, ["date", "from", "to"]);
                  setRange(undefined);
                  setDateOpen(false);
                }}
              >
                Clear
              </Button>
              <Button
                type="button"
                className="h-8 rounded-[8px] text-[12px]"
                disabled={!range?.from}
                onClick={() => {
                  if (!range?.from) return;
                  const next: Partial<OrdersSearch> = {
                    date: "custom",
                    from: range.from.toISOString(),
                  };
                  if (range.to) next.to = endOfDay(range.to).toISOString();
                  else delete next.to;
                  patch(next, range.to ? [] : ["to"]);
                  setDateOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterButton
              label={moreCount > 0 ? `More filters (${moreCount})` : "More filters"}
              active={moreCount > 0}
              aria-label="More filters"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-[10px]">
            <DropdownMenuLabel className="text-[12px] text-muted-foreground">
              Shipping company
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => patch({}, ["shipping"])}>Any</DropdownMenuItem>
            {facets.shippingCompanies.map((company) => (
              <DropdownMenuItem key={company} onClick={() => patch({ shipping: company })}>
                {search.shipping === company ? <Check className="size-3.5" /> : null}
                {company}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[12px] text-muted-foreground">
              Tracking
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => patch({}, ["tracking"])}>Any</DropdownMenuItem>
            <DropdownMenuItem onClick={() => patch({ tracking: "yes" })}>
              {search.tracking === "yes" ? <Check className="size-3.5" /> : null}
              Has tracking
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => patch({ tracking: "no" })}>
              {search.tracking === "no" ? <Check className="size-3.5" /> : null}
              No tracking
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters(search) ? (
          <button
            type="button"
            onClick={() =>
              onChange({
                supply: search.supply,
                page: 1,
                pageSize: search.pageSize,
                sort: search.sort,
                dir: search.dir,
              })
            }
            className="inline-flex h-10 items-center gap-1 px-2 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" strokeWidth={1.5} />
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}

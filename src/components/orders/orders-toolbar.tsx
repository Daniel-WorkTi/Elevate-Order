import { useEffect, useRef, useState, forwardRef, type ComponentProps } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { endOfDay } from "date-fns";
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
import {
  clearFiltersSearch,
  DATE_PRESET_I18N_KEY,
  hasActiveFilters,
  type OrdersSearch,
} from "@/lib/orders-search";
import { formatDayMonth } from "@/lib/i18n/date-locale";
import { useI18n } from "@/lib/i18n/locale-context";
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
  const { t, locale } = useI18n();
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
      ? `${formatDayMonth(new Date(search.from), locale)}${search.to ? ` – ${formatDayMonth(new Date(search.to), locale)}` : ""}`
      : t(DATE_PRESET_I18N_KEY[search.date])
    : t("common.date");

  const statuses = facets.statuses ?? [];
  const shippingCompanies = facets.shippingCompanies ?? [];
  const countries = facets.countries ?? [];
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
          placeholder={t("orders.searchPlaceholder")}
          aria-label={t("orders.searchAria")}
          className="h-10 rounded-[10px] border-border bg-card pl-9 text-[13px] shadow-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterButton
              label={search.status ?? t("common.status")}
              active={Boolean(search.status)}
              aria-label={t("orders.filterStatusAria")}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-72 w-52 overflow-y-auto rounded-[10px]"
          >
            <DropdownMenuItem onClick={() => patch({}, ["status"])}>
              {t("orders.allStatuses")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {statuses.length === 0 ? (
              <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
                {t("orders.noStatusesYet")}
              </p>
            ) : (
              statuses.map((status) => (
                <DropdownMenuItem key={status} onClick={() => patch({ status })}>
                  {search.status === status ? <Check className="size-3.5" /> : null}
                  {status}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {countries.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <FilterButton
                label={search.country ?? t("common.country")}
                active={Boolean(search.country)}
                aria-label={t("orders.filterCountryAria")}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-72 w-48 overflow-y-auto rounded-[10px]"
            >
              <DropdownMenuItem onClick={() => patch({}, ["country"])}>
                {t("orders.allCountries")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {countries.map((country) => (
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
              aria-label={t("orders.filterDateAria")}
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
                {t("orders.today")}
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
                {t("orders.last7Days")}
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
                {t("orders.last30Days")}
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
                {t("common.clear")}
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
                {t("common.apply")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterButton
              label={
                moreCount > 0
                  ? t("orders.moreFiltersCount", { count: moreCount })
                  : t("orders.moreFilters")
              }
              active={moreCount > 0}
              aria-label={t("orders.moreFiltersAria")}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-[10px]">
            <DropdownMenuLabel className="text-[12px] text-muted-foreground">
              {t("orders.shippingCompany")}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => patch({}, ["shipping"])}>
              {t("common.any")}
            </DropdownMenuItem>
            {shippingCompanies.map((company) => (
              <DropdownMenuItem key={company} onClick={() => patch({ shipping: company })}>
                {search.shipping === company ? <Check className="size-3.5" /> : null}
                {company}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[12px] text-muted-foreground">
              {t("orders.col.tracking")}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => patch({}, ["tracking"])}>
              {t("common.any")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => patch({ tracking: "yes" })}>
              {search.tracking === "yes" ? <Check className="size-3.5" /> : null}
              {t("orders.hasTracking")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => patch({ tracking: "no" })}>
              {search.tracking === "no" ? <Check className="size-3.5" /> : null}
              {t("orders.noTracking")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters(search) ? (
          <button
            type="button"
            onClick={() => onChange(clearFiltersSearch(search))}
            className="inline-flex h-10 items-center gap-1 px-2 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" strokeWidth={1.5} />
            {t("orders.clearFilters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { endOfDay } from "date-fns";
import { CalendarDays, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDayMonth } from "@/lib/i18n/date-locale";
import { useI18n, useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export type InboxFilters = {
  range: "today" | "7d" | "all" | "custom";
  from?: string;
  to?: string;
  priority: "all" | "critical" | "waiting" | "followup";
  status: "all" | "incident" | "waiting" | "no_response";
  country: string;
  sort: "priority" | "recent";
};

export function InboxToolbar({
  filters,
  countries,
  onChange,
}: {
  filters: InboxFilters;
  countries: string[];
  onChange: (next: InboxFilters) => void;
}) {
  const { t, locale } = useI18n();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    if (!filters.from && !filters.to) return undefined;
    return {
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
    };
  });

  useEffect(() => {
    if (filters.range !== "custom") {
      setRange(undefined);
      return;
    }
    setRange({
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
    });
  }, [filters.range, filters.from, filters.to]);

  const customActive = filters.range === "custom" && Boolean(filters.from);
  const filtersActive =
    filters.priority !== "all" || filters.status !== "all" || filters.country !== "all";

  return (
    <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
      <Select
        value={filters.range === "custom" ? "custom" : filters.range}
        onValueChange={(value) => {
          if (value === "custom") {
            setCalendarOpen(true);
            return;
          }
          const next: InboxFilters = {
            ...filters,
            range: value as Exclude<InboxFilters["range"], "custom">,
          };
          delete next.from;
          delete next.to;
          onChange(next);
        }}
      >
        <SelectTrigger className="h-9 min-w-0 flex-1 rounded-[10px] border-[#E6E8EC] bg-white text-[13px] shadow-none sm:w-[130px] sm:flex-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">{t("inbox.today")}</SelectItem>
          <SelectItem value="7d">{t("inbox.last7Days")}</SelectItem>
          <SelectItem value="all">{t("inbox.allTime")}</SelectItem>
          {customActive ? (
            <SelectItem value="custom">
              {filters.from
                ? filters.to
                  ? `${formatDayMonth(new Date(filters.from), locale)} – ${formatDayMonth(new Date(filters.to), locale)}`
                  : formatDate(new Date(filters.from), locale)
                : t("common.custom")}
            </SelectItem>
          ) : null}
        </SelectContent>
      </Select>

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "size-9 rounded-[10px] border-[#E6E8EC] bg-white shadow-none",
              customActive && "border-[#2563EB]/40 bg-[#EFF6FF] text-[#2563EB]",
            )}
            aria-label={t("common.selectDates")}
          >
            <CalendarDays
              className={cn("size-4", customActive ? "text-[#2563EB]" : "text-[#667085]")}
              strokeWidth={1.5}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto rounded-[12px] border-[#E6E8EC] p-3">
          <p className="mb-2 text-[12px] font-medium text-[#667085]">
            {t("common.selectDateRange")}
          </p>
          <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={1} />
          <div className="mt-3 flex justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-[8px] text-[12px]"
              onClick={() => {
                setRange(undefined);
                const next: InboxFilters = { ...filters, range: "all" };
                delete next.from;
                delete next.to;
                onChange(next);
                setCalendarOpen(false);
              }}
            >
              {t("common.clear")}
            </Button>
            <Button
              type="button"
              className="h-8 rounded-[8px] bg-[#2563EB] text-[12px] shadow-none hover:bg-[#1D4ED8]"
              disabled={!range?.from}
              onClick={() => {
                if (!range?.from) return;
                const next: InboxFilters = {
                  ...filters,
                  range: "custom",
                  from: range.from.toISOString(),
                };
                if (range.to) next.to = endOfDay(range.to).toISOString();
                else delete next.to;
                onChange(next);
                setCalendarOpen(false);
              }}
            >
              {t("common.apply")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "size-9 rounded-[10px] border-[#E6E8EC] bg-white shadow-none",
              filtersActive && "border-[#2563EB]/40 bg-[#EFF6FF] text-[#2563EB]",
            )}
            aria-label={t("inbox.filters")}
          >
            <SlidersHorizontal
              className={cn("size-4", filtersActive ? "text-[#2563EB]" : "text-[#667085]")}
              strokeWidth={1.5}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[260px] space-y-3 rounded-[12px] border-[#E6E8EC] p-3">
          <p className="text-[12px] font-medium text-[#667085]">{t("inbox.filters")}</p>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wide text-[#667085]">
              {t("inbox.priority")}
            </label>
            <Select
              value={filters.priority}
              onValueChange={(value) =>
                onChange({ ...filters, priority: value as InboxFilters["priority"] })
              }
            >
              <SelectTrigger className="h-9 w-full rounded-[10px] border-[#E6E8EC] bg-white text-[13px] shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="critical">{t("inbox.critical")}</SelectItem>
                <SelectItem value="waiting">{t("inbox.waiting")}</SelectItem>
                <SelectItem value="followup">{t("inbox.followUp")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wide text-[#667085]">
              {t("common.status")}
            </label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                onChange({ ...filters, status: value as InboxFilters["status"] })
              }
            >
              <SelectTrigger className="h-9 w-full rounded-[10px] border-[#E6E8EC] bg-white text-[13px] shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="incident">{t("inbox.incidents")}</SelectItem>
                <SelectItem value="waiting">{t("inbox.waiting")}</SelectItem>
                <SelectItem value="no_response">{t("inbox.noResponse")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wide text-[#667085]">
              {t("common.country")}
            </label>
            <Select
              value={filters.country}
              onValueChange={(value) => onChange({ ...filters, country: value })}
            >
              <SelectTrigger className="h-9 w-full rounded-[10px] border-[#E6E8EC] bg-white text-[13px] shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-[8px] text-[12px]"
              onClick={() => {
                onChange({
                  ...filters,
                  priority: "all",
                  status: "all",
                  country: "all",
                });
              }}
            >
              {t("common.clear")}
            </Button>
            <Button
              type="button"
              className="h-8 rounded-[8px] bg-[#2563EB] text-[12px] shadow-none hover:bg-[#1D4ED8]"
              onClick={() => setFiltersOpen(false)}
            >
              {t("common.done")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function InboxQueueFilters({
  filters,
  countries,
  onChange,
}: {
  filters: InboxFilters;
  countries: string[];
  onChange: (next: InboxFilters) => void;
}) {
  const t = useT();

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
      <Select
        value={filters.priority}
        onValueChange={(value) =>
          onChange({ ...filters, priority: value as InboxFilters["priority"] })
        }
      >
        <SelectTrigger className="h-9 w-full rounded-[10px] border-[#E6E8EC] bg-white text-[13px] shadow-none sm:w-[120px]">
          <SelectValue placeholder={t("inbox.priority")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("inbox.priority")}</SelectItem>
          <SelectItem value="critical">{t("inbox.critical")}</SelectItem>
          <SelectItem value="waiting">{t("inbox.waiting")}</SelectItem>
          <SelectItem value="followup">{t("inbox.followUp")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(value) =>
          onChange({ ...filters, status: value as InboxFilters["status"] })
        }
      >
        <SelectTrigger className="h-9 w-full rounded-[10px] border-[#E6E8EC] bg-white text-[13px] shadow-none sm:w-[120px]">
          <SelectValue placeholder={t("common.status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("common.status")}</SelectItem>
          <SelectItem value="incident">{t("inbox.incidents")}</SelectItem>
          <SelectItem value="waiting">{t("inbox.waiting")}</SelectItem>
          <SelectItem value="no_response">{t("inbox.noResponse")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.country}
        onValueChange={(value) => onChange({ ...filters, country: value })}
      >
        <SelectTrigger className="h-9 w-full rounded-[10px] border-[#E6E8EC] bg-white text-[13px] shadow-none sm:w-[130px]">
          <SelectValue placeholder={t("common.country")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("common.country")}</SelectItem>
          {countries.map((country) => (
            <SelectItem key={country} value={country}>
              {country}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          "size-9 w-full rounded-[10px] border-[#E6E8EC] bg-white shadow-none sm:w-9",
          (filters.sort ?? "priority") === "recent" &&
            "border-[#2563EB]/40 bg-[#EFF6FF] text-[#2563EB]",
        )}
        aria-label={
          (filters.sort ?? "priority") === "priority"
            ? t("inbox.sortByRecent")
            : t("inbox.sortByPriority")
        }
        title={
          (filters.sort ?? "priority") === "priority"
            ? t("inbox.sortByRecent")
            : t("inbox.sortByPriority")
        }
        onClick={() =>
          onChange({
            ...filters,
            sort: (filters.sort ?? "priority") === "priority" ? "recent" : "priority",
          })
        }
      >
        <ArrowUpDown className="size-4 text-[#667085]" strokeWidth={1.5} />
      </Button>
    </div>
  );
}

import { CalendarDays, ArrowUpDown, SlidersHorizontal } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export type InboxFilters = {
  range: "today" | "7d" | "all";
  priority: "all" | "critical" | "waiting" | "followup";
  status: "all" | "incident" | "waiting" | "no_response";
  country: string;
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
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.range}
        onValueChange={(value) =>
          onChange({ ...filters, range: value as InboxFilters["range"] })
        }
      >
        <SelectTrigger className="h-9 w-[110px] rounded-[10px] border-[#E6E8EC] bg-white text-[13px] shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 rounded-[10px] border-[#E6E8EC] bg-white shadow-none"
        aria-label="Calendar"
      >
        <CalendarDays className="size-4 text-[#667085]" strokeWidth={1.5} />
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 rounded-[10px] border-[#E6E8EC] bg-white shadow-none"
        aria-label="Filters"
      >
        <SlidersHorizontal className="size-4 text-[#667085]" strokeWidth={1.5} />
      </Button>
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
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.priority}
        onValueChange={(value) =>
          onChange({ ...filters, priority: value as InboxFilters["priority"] })
        }
      >
        <SelectTrigger className="h-9 w-[120px] rounded-[10px] border-[#E6E8EC] bg-white text-[13px] shadow-none">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Priority</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="waiting">Waiting</SelectItem>
          <SelectItem value="followup">Follow-up</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(value) =>
          onChange({ ...filters, status: value as InboxFilters["status"] })
        }
      >
        <SelectTrigger className="h-9 w-[120px] rounded-[10px] border-[#E6E8EC] bg-white text-[13px] shadow-none">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Status</SelectItem>
          <SelectItem value="incident">Incidents</SelectItem>
          <SelectItem value="waiting">Waiting</SelectItem>
          <SelectItem value="no_response">No response</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.country}
        onValueChange={(value) => onChange({ ...filters, country: value })}
      >
        <SelectTrigger className="h-9 w-[130px] rounded-[10px] border-[#E6E8EC] bg-white text-[13px] shadow-none">
          <SelectValue placeholder="Country" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Country</SelectItem>
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
        className="size-9 rounded-[10px] border-[#E6E8EC] bg-white shadow-none"
        aria-label="Sort"
      >
        <ArrowUpDown className="size-4 text-[#667085]" strokeWidth={1.5} />
      </Button>
    </div>
  );
}

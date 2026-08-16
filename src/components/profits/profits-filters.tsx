import type { ReactNode } from "react";

import { SupplyName } from "@/components/supply-logo";
import {
  PERIOD_LABEL,
  PROFIT_CURRENCIES,
  supplyFilterLabel,
  type ProfitsSearch,
  type ProfitPeriod,
  type ProfitsSupplyFilter,
} from "@/lib/profits/profits-search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function ProfitsFilters({
  search,
  onChange,
  ratesLabel,
}: {
  search: ProfitsSearch;
  onChange: (next: ProfitsSearch) => void;
  ratesLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-card px-4 py-3 md:flex-row md:flex-wrap md:items-end md:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <FilterField label="Supply">
          <Select
            value={search.supply}
            onValueChange={(value) =>
              onChange({ ...search, supply: value as ProfitsSupplyFilter })
            }
          >
            <SelectTrigger className="h-9 w-[160px] rounded-[10px] text-[13px] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["all", "dropi", "dropea"] as const).map((value) => (
                <SelectItem key={value} value={value}>
                  {value === "all" ? (
                    supplyFilterLabel(value)
                  ) : (
                    <SupplyName supply={value} />
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Period">
          <Select
            value={search.period}
            onValueChange={(value) =>
              onChange({ ...search, period: value as ProfitPeriod })
            }
          >
            <SelectTrigger className="h-9 w-[160px] rounded-[10px] text-[13px] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABEL) as ProfitPeriod[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {PERIOD_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        {search.period === "custom" ? (
          <>
            <FilterField label="From">
              <Input
                type="date"
                value={search.from?.slice(0, 10) ?? ""}
                onChange={(event) =>
                  onChange({ ...search, from: event.target.value || undefined })
                }
                className="h-9 w-[150px] rounded-[10px] text-[13px] shadow-none"
              />
            </FilterField>
            <FilterField label="To">
              <Input
                type="date"
                value={search.to?.slice(0, 10) ?? ""}
                onChange={(event) =>
                  onChange({ ...search, to: event.target.value || undefined })
                }
                className="h-9 w-[150px] rounded-[10px] text-[13px] shadow-none"
              />
            </FilterField>
          </>
        ) : null}

        <FilterField label="Currency">
          <Select
            value={search.currency}
            onValueChange={(value) =>
              onChange({
                ...search,
                currency: value as ProfitsSearch["currency"],
              })
            }
          >
            <SelectTrigger className="h-9 w-[110px] rounded-[10px] text-[13px] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROFIT_CURRENCIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </div>

      <p className="text-[12px] text-muted-foreground">{ratesLabel}</p>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

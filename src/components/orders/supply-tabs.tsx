import { SupplyMark } from "@/components/supply-logo";
import { cn } from "@/lib/utils";
import type { Supply } from "@/lib/order-domain";
import { SUPPLY_LABEL } from "@/lib/order-domain";

const SUPPLIES: Supply[] = ["dropi", "dropea", "shopify"];

export function SupplyTabs({
  value,
  onChange,
}: {
  value: Supply;
  onChange: (supply: Supply) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Supply"
      className="inline-flex h-[42px] items-center rounded-[10px] border border-border bg-card p-0.5"
    >
      {SUPPLIES.map((supply) => {
        const selected = supply === value;
        return (
          <button
            key={supply}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(supply)}
            className={cn(
              "inline-flex h-[38px] min-w-[96px] items-center justify-center gap-2 rounded-[8px] px-3.5 text-[13px] font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40",
              selected
                ? "border border-[color:var(--elevate-blue)]/20 bg-[color:var(--elevate-blue-soft)] text-[color:var(--elevate-blue)]"
                : "border border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <SupplyMark supply={supply} size={18} />
            {SUPPLY_LABEL[supply]}
          </button>
        );
      })}
    </div>
  );
}

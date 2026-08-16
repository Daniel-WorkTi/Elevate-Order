import { SupplyMark } from "@/components/supply-logo";
import { cn } from "@/lib/utils";
import { SUPPLY_LABEL } from "@/lib/order-domain";

const SUPPLIES = ["dropi", "dropea"] as const;
type InboxSupply = (typeof SUPPLIES)[number];

export function InboxSupplyTabs({
  value,
  onChange,
  counts,
}: {
  value: InboxSupply;
  onChange: (supply: InboxSupply) => void;
  counts: Record<InboxSupply, number>;
}) {
  return (
    <div
      role="tablist"
      aria-label="Supply"
      className="inline-flex h-[42px] items-center rounded-[10px] border border-[#E6E8EC] bg-white p-0.5"
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
              "inline-flex h-[38px] items-center gap-2 rounded-[8px] px-3.5 text-[13px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40",
              selected
                ? "bg-[#EFF6FF] text-[#2563EB]"
                : "text-[#667085] hover:text-[#0A0C10]",
            )}
          >
            <SupplyMark supply={supply} size={18} />
            {SUPPLY_LABEL[supply]}
            <span
              className={cn(
                "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                selected ? "bg-[#2563EB] text-white" : "bg-[#F2F4F7] text-[#667085]",
              )}
            >
              {counts[supply]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

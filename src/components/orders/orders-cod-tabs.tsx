import { useT } from "@/lib/i18n/locale-context";
import type { CodReplyFilter } from "@/lib/orders-search";
import type { Supply } from "@/lib/order-domain";
import { cn } from "@/lib/utils";

const BASE_TABS: CodReplyFilter[] = ["all", "yes", "no", "awaiting"];

const TAB_I18N: Record<CodReplyFilter, string> = {
  all: "orders.codReply.all",
  dropi_pending: "orders.codReply.dropiPending",
  yes: "orders.codReply.yes",
  no: "orders.codReply.no",
  awaiting: "orders.codReply.awaiting",
};

export function OrdersCodTabs({
  active,
  counts,
  supply,
  onChange,
}: {
  active: CodReplyFilter;
  counts?: { dropi_pending: number; yes: number; no: number; awaiting: number };
  supply: Supply;
  onChange: (next: CodReplyFilter) => void;
}) {
  const t = useT();
  const tabs: CodReplyFilter[] =
    supply === "dropi" ? ["all", "dropi_pending", "yes", "no", "awaiting"] : BASE_TABS;

  function countFor(tab: CodReplyFilter): number | null {
    if (!counts || tab === "all") return null;
    return counts[tab];
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const count = countFor(tab);
        const selected = active === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-[10px] border px-3 text-[13px] font-medium transition-colors",
              selected
                ? "border-[#2563EB]/25 bg-[#EFF6FF] text-[#2563EB]"
                : "border-[#E6E8EC] bg-white text-[#667085] hover:bg-[#F7F8FA]",
            )}
          >
            {t(TAB_I18N[tab])}
            {count != null && count > 0 ? (
              <span
                className={cn(
                  "inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                  selected ? "bg-[#2563EB] text-white" : "bg-[#F2F4F7] text-[#667085]",
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

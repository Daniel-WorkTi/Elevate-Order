import { RefreshCw } from "lucide-react";

import { SupplyTabs } from "@/components/orders/supply-tabs";
import { Button } from "@/components/ui/button";
import type { Supply } from "@/lib/order-domain";

export function OrdersPageHeader({
  supply,
  onSupplyChange,
  onRefresh,
  refreshing = false,
}: {
  supply: Supply;
  onSupplyChange: (supply: Supply) => void;
  onRefresh?: (() => void) | undefined;
  refreshing?: boolean | undefined;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SupplyTabs value={supply} onChange={onSupplyChange} />
      {onRefresh ? (
        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
          disabled={refreshing}
          className="h-10 rounded-[10px] border-border bg-card px-3 text-[13px] font-medium shadow-none"
        >
          <RefreshCw
            className={refreshing ? "size-3.5 animate-spin" : "size-3.5"}
            strokeWidth={1.5}
          />
          Refresh
        </Button>
      ) : null}
    </div>
  );
}

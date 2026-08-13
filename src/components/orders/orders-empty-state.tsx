import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { SUPPLY_LABEL, type Supply } from "@/lib/order-domain";

export function OrdersEmptyState({
  supply,
  filtered,
  onClearFilters,
}: {
  supply: Supply;
  filtered: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[15px] font-medium text-foreground">
        No {SUPPLY_LABEL[supply]} orders found.
      </p>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
        Try changing your filters or check the connection.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {filtered ? (
          <Button
            type="button"
            variant="outline"
            onClick={onClearFilters}
            className="h-9 rounded-[10px] border-border bg-card text-[13px] shadow-none"
          >
            Clear filters
          </Button>
        ) : null}
        <Button asChild className="h-9 rounded-[10px] text-[13px] shadow-none">
          <Link to="/connections" search={{ source: supply }}>
            Check connection
          </Link>
        </Button>
      </div>
    </div>
  );
}

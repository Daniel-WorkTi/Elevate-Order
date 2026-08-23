import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";
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
  const t = useT();

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[15px] font-medium text-foreground">
        {t("orders.emptyTitle", { supply: SUPPLY_LABEL[supply] })}
      </p>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
        {supply === "dropi" && !filtered ? t("orders.emptyHintDropi") : t("orders.emptyHint")}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {filtered ? (
          <Button
            type="button"
            variant="outline"
            onClick={onClearFilters}
            className="h-9 rounded-[10px] border-border bg-card text-[13px] shadow-none"
          >
            {t("orders.clearFilters")}
          </Button>
        ) : null}
        <Button asChild className="h-9 rounded-[10px] text-[13px] shadow-none">
          <Link to={supply === "dropea" ? "/connections/dropea" : "/connections"}>
            {t("orders.checkConnection")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

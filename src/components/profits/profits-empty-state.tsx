import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";

export function ProfitsEmptyState({
  onClear,
  onShowAllTime,
  supplyMatchCount,
}: {
  onClear: () => void;
  onShowAllTime: () => void;
  supplyMatchCount: number;
}) {
  const t = useT();
  const hasOutsidePeriod = supplyMatchCount > 0;

  return (
    <div className="rounded-[16px] border border-border bg-card px-6 py-14 text-center">
      <h2 className="text-[16px] font-semibold text-foreground">{t("profits.emptyTitle")}</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {hasOutsidePeriod
          ? t(
              supplyMatchCount === 1
                ? "profits.emptyOutsidePeriodOne"
                : "profits.emptyOutsidePeriod",
              { count: supplyMatchCount },
            )
          : t("profits.emptyHint")}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {hasOutsidePeriod ? (
          <Button
            type="button"
            className="h-9 rounded-[10px] text-[13px] shadow-none"
            onClick={onShowAllTime}
          >
            {t("profits.showAllTime")}
          </Button>
        ) : null}
        <Button
          type="button"
          variant={hasOutsidePeriod ? "outline" : "default"}
          className="h-9 rounded-[10px] text-[13px] shadow-none"
          onClick={onClear}
        >
          {t("common.clearFilters")}
        </Button>
      </div>
    </div>
  );
}

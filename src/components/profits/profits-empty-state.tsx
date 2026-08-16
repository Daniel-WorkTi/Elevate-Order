import { Button } from "@/components/ui/button";

export function ProfitsEmptyState({
  onClear,
  onShowAllTime,
  supplyMatchCount,
}: {
  onClear: () => void;
  onShowAllTime: () => void;
  supplyMatchCount: number;
}) {
  const hasOutsidePeriod = supplyMatchCount > 0;

  return (
    <div className="rounded-[16px] border border-border bg-card px-6 py-14 text-center">
      <h2 className="text-[16px] font-semibold text-foreground">No financial data found.</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {hasOutsidePeriod
          ? `There ${supplyMatchCount === 1 ? "is" : "are"} ${supplyMatchCount} synchronized order${supplyMatchCount === 1 ? "" : "s"} outside this period.`
          : "Try changing the period or supply filter — or sync orders from Dropi / Dropea first."}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {hasOutsidePeriod ? (
          <Button
            type="button"
            className="h-9 rounded-[10px] text-[13px] shadow-none"
            onClick={onShowAllTime}
          >
            Show all time
          </Button>
        ) : null}
        <Button
          type="button"
          variant={hasOutsidePeriod ? "outline" : "default"}
          className="h-9 rounded-[10px] text-[13px] shadow-none"
          onClick={onClear}
        >
          Clear filters
        </Button>
      </div>
    </div>
  );
}

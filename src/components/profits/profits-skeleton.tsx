import { Skeleton } from "@/components/ui/skeleton";

export function ProfitsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-14 w-full rounded-[16px]" />
      <Skeleton className="h-28 w-full rounded-[16px]" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
        <Skeleton className="h-[340px] w-full rounded-[16px]" />
        <Skeleton className="h-[340px] w-full rounded-[16px]" />
      </div>
      <Skeleton className="h-64 w-full rounded-[16px]" />
    </div>
  );
}

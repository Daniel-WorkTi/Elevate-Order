import { Skeleton } from "@/components/ui/skeleton";

export function OrdersTableSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="flex gap-2">
        <Skeleton className="h-[42px] w-[200px] rounded-[10px]" />
        <Skeleton className="ml-auto h-10 w-[96px] rounded-[10px]" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 min-w-[240px] flex-1 rounded-[10px]" />
        <Skeleton className="h-10 w-[88px] rounded-[10px]" />
        <Skeleton className="h-10 w-[88px] rounded-[10px]" />
        <Skeleton className="h-10 w-[110px] rounded-[10px]" />
      </div>
      <div className="overflow-hidden rounded-[16px] border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-full max-w-3xl" />
        </div>
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="flex h-[60px] items-center gap-4 border-b border-border px-4 last:border-0"
          >
            <Skeleton className="h-4 w-[88px]" />
            <Skeleton className="h-4 w-[140px]" />
            <Skeleton className="h-5 w-[72px] rounded-full" />
            <Skeleton className="h-4 w-[64px]" />
            <Skeleton className="hidden h-4 w-[72px] md:block" />
            <Skeleton className="hidden h-4 w-[110px] lg:block" />
            <Skeleton className="ml-auto h-4 w-[56px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export function OrderDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.95fr)_minmax(280px,1fr)]">
      <div className="space-y-4">
        <div className="rounded-[16px] border border-border bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="rounded-[16px] border border-border bg-card p-5 space-y-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="rounded-[16px] border border-border bg-card p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="rounded-[16px] border border-border bg-card p-5 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
      <div className="rounded-[16px] border border-border bg-card p-5 space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

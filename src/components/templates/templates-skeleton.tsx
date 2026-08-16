import { Skeleton } from "@/components/ui/skeleton";

export function TemplatesSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)_340px]">
      <div className="rounded-[16px] border border-border bg-card p-3 space-y-2">
        <Skeleton className="h-5 w-24" />
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-[10px]" />
        ))}
      </div>
      <div className="rounded-[16px] border border-border bg-card p-5 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-[380px] w-full rounded-[12px]" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </div>
      <div className="rounded-[16px] border border-border bg-card p-4 space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-40 w-full rounded-[12px]" />
      </div>
    </div>
  );
}

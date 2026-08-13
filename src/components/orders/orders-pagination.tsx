import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZES, type PageSize } from "@/lib/order-domain";
import { cn } from "@/lib/utils";

function pageItems(page: number, pageCount: number): Array<number | "ellipsis"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  if (start > 2) items.push("ellipsis");
  for (let n = start; n <= end; n += 1) items.push(n);
  if (end < pageCount - 1) items.push("ellipsis");
  items.push(pageCount);
  return items;
}

export function OrdersPagination({
  page,
  pageSize,
  total,
  pageCount,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: PageSize;
  total: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const items = pageItems(page, pageCount);

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {from}–{to}
        </span>{" "}
        of <span className="font-medium text-foreground">{total}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value) as PageSize)}
        >
          <SelectTrigger
            aria-label="Rows per page"
            className="h-9 w-[88px] rounded-[10px] border-border bg-card text-[13px] shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-[10px] border-border bg-card shadow-none"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" strokeWidth={1.5} />
          </Button>
          {items.map((item, index) =>
            item === "ellipsis" ? (
              <span key={`e-${index}`} className="px-1 text-[13px] text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={item}
                type="button"
                variant="outline"
                className={cn(
                  "size-9 rounded-[10px] border-border bg-card p-0 text-[13px] shadow-none",
                  item === page &&
                    "border-[color:var(--elevate-blue)]/20 bg-[color:var(--elevate-blue-soft)] text-[color:var(--elevate-blue)]",
                )}
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            ),
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-[10px] border-border bg-card shadow-none"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="size-4" strokeWidth={1.5} />
          </Button>
        </nav>
      </div>
    </div>
  );
}

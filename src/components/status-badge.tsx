import { CheckCircle2, Clock, MessageCircle, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { statusMeta, type OrderStatus } from "@/lib/orders";

const icons = {
  confirmed: CheckCircle2,
  messaged: MessageCircle,
  unanswered: Clock,
  incident: TriangleAlert,
} as const;

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: OrderStatus;
  label?: string;
  className?: string;
}) {
  const Icon = icons[status];
  const meta = statusMeta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        meta.chip,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {label ?? meta.label}
    </span>
  );
}

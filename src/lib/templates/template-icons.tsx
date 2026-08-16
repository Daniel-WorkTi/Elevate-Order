import {
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquareText,
  Package,
  TriangleAlert,
  Truck,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type { TemplateKind } from "@/lib/templates/types";

export const TEMPLATE_KIND_ICON: Record<TemplateKind, LucideIcon> = {
  address_problem: MapPin,
  delivery_attempt: Truck,
  tracking_update: Package,
  follow_up: MessageSquareText,
  confirmation: CheckCircle2,
  incident: TriangleAlert,
  cancelled: XCircle,
};

/** Soft icon tile colors matching the operational mock. */
export const TEMPLATE_KIND_ICON_CLASS: Record<TemplateKind, string> = {
  address_problem: "bg-amber-50 text-amber-700",
  delivery_attempt: "bg-sky-50 text-sky-700",
  tracking_update: "bg-[color:var(--elevate-blue-soft)] text-[color:var(--elevate-blue)]",
  follow_up: "bg-violet-50 text-violet-700",
  confirmation: "bg-emerald-50 text-emerald-700",
  incident: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
};

export { Clock };

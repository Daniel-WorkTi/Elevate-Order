import {
  Cable,
  CircleDollarSign,
  FileText,
  Inbox,
  Package,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  label: string;
  href: "/" | "/orders" | "/templates" | "/profits" | "/connections";
  icon: LucideIcon;
  /** When true, shell may render an optional attention badge */
  showBadge?: boolean;
};

export const APP_NAVIGATION: readonly AppNavItem[] = [
  { label: "Inbox", href: "/", icon: Inbox, showBadge: true },
  { label: "Orders", href: "/orders", icon: Package },
  { label: "Templates", href: "/templates", icon: FileText },
  { label: "Profits", href: "/profits", icon: CircleDollarSign },
  { label: "Connections", href: "/connections", icon: Cable },
] as const;

export function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

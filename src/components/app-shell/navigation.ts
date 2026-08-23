import {
  Cable,
  CircleDollarSign,
  FileText,
  Inbox,
  Package,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  /** i18n key under nav.* */
  labelKey: "nav.inbox" | "nav.orders" | "nav.templates" | "nav.profits" | "nav.connections";
  href: "/" | "/orders" | "/templates" | "/profits" | "/connections";
  icon: LucideIcon;
  /** When true, shell may render an optional attention badge */
  showBadge?: boolean;
};

export const APP_NAVIGATION: readonly AppNavItem[] = [
  { labelKey: "nav.inbox", href: "/", icon: Inbox, showBadge: true },
  { labelKey: "nav.orders", href: "/orders", icon: Package },
  { labelKey: "nav.templates", href: "/templates", icon: FileText },
  { labelKey: "nav.profits", href: "/profits", icon: CircleDollarSign },
  { labelKey: "nav.connections", href: "/connections", icon: Cable },
] as const;

export function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

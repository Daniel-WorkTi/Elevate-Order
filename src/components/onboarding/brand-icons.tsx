import type { SVGProps } from "react";

import { SupplyLogo } from "@/components/supply-logo";
import { cn } from "@/lib/utils";

/** Shopify stays as a mark; Dropi / Dropea use official logos. */

export function ShopifyMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M16.2 5.4c-.2-1.3-1-1.6-1-1.6s-1.1-.1-2.2-.1c-.2-.4-.5-1-1.2-1-.1 0-.2 0-.3.1l-1.4 4.1c-.4 0-.9.1-1.4.1L7.2 4.6S6 4.4 5.8 5.7L4 19.3l10.6 1.8 5.4-1.2-3.8-14.5Z"
        fill="#95BF47"
      />
      <path
        d="M15.2 3.8s-1.1-.1-2.2-.1c-.2-.4-.5-1-1.2-1-.7 0-1.2.5-1.5 1.1l3.2.6c.4.1.7.1 1 .1l.7-.7Z"
        fill="#5E8E3E"
      />
      <path
        d="M14.2 9.2c0 .1-.1.2-.2.2h-.1c-.5.1-1.1.2-1.8.2-.9 0-1.7-.2-1.7-.7 0-.4.4-.6.9-.8.3-.1.7-.2 1-.3l.7-.2c.7-.2 1.1-.5 1.1-1 0-.6-.6-1-1.6-1-1.1 0-1.9.4-2 .5l.3 1.1c.1 0 .6-.3 1.2-.3.5 0 .7.2.7.3 0 .2-.2.3-.7.5l-.7.2c-1 .3-1.5.7-1.5 1.4 0 1 1 1.6 2.5 1.6.7 0 1.4-.1 1.8-.3l.3-1.1Z"
        fill="#fff"
      />
    </svg>
  );
}

export function DropiMark({ className }: { className?: string }) {
  return (
    <SupplyLogo
      supply="dropi"
      size={28}
      {...(className ? { className } : {})}
    />
  );
}

export function DropeaMark({ className }: { className?: string }) {
  return (
    <SupplyLogo
      supply="dropea"
      size={28}
      className={cn("rounded-[8px] object-cover", className)}
    />
  );
}

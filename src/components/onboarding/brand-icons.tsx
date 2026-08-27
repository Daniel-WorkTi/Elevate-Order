import { SupplyLogo } from "@/components/supply-logo";
import type { Supply } from "@/lib/order-domain";
import { cn } from "@/lib/utils";

/** Official brand PNGs from `@/assets` — no hand-drawn marks. */

function BrandLogo({
  supply,
  className,
}: {
  supply: Supply;
  className?: string;
}) {
  const fillTile = supply === "dropea";
  return (
    <SupplyLogo
      supply={supply}
      size={fillTile ? 48 : 36}
      className={cn(
        fillTile ? "size-full object-cover" : "size-9 object-contain",
        className,
      )}
    />
  );
}

export function ShopifyMark({ className }: { className?: string }) {
  return <BrandLogo supply="shopify" {...(className ? { className } : {})} />;
}

export function DropiMark({ className }: { className?: string }) {
  return <BrandLogo supply="dropi" {...(className ? { className } : {})} />;
}

export function DropeaMark({ className }: { className?: string }) {
  return <BrandLogo supply="dropea" {...(className ? { className } : {})} />;
}

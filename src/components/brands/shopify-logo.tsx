import { cn } from "@/lib/utils";

const SHOPIFY_LOGO_SRC = "/brands/shopify.png";

type ShopifyLogoProps = {
  size?: number;
  className?: string;
};

/** Official Shopify bag mark — use everywhere instead of inline imports. */
export function ShopifyLogo({ size = 36, className }: ShopifyLogoProps) {
  return (
    <img
      src={SHOPIFY_LOGO_SRC}
      alt=""
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      className={cn("block shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

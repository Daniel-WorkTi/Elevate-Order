import dropiLogo from "@/assets/dropi-logo.png";
import dropeaLogo from "@/assets/dropea-logo.png";
import shopifyLogo from "@/assets/shopify-mark.png";
import type { Supply } from "@/lib/order-domain";
import { SUPPLY_LABEL } from "@/lib/order-domain";
import { cn } from "@/lib/utils";

const SRC: Record<Supply, string> = {
  dropi: dropiLogo,
  dropea: dropeaLogo,
  shopify: shopifyLogo,
};

export function SupplyLogo({
  supply,
  size = 20,
  className,
}: {
  supply: Supply;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={SRC[supply]}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      decoding="async"
    />
  );
}

export function SupplyMark({
  supply,
  size = 20,
  className,
}: {
  supply: Supply;
  size?: number;
  className?: string;
}) {
  const isDropea = supply === "dropea";

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-[8px] border",
        isDropea ? "border-[#0A0C10] bg-[#0A0C10]" : "border-[#E6E8EC] bg-white",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <SupplyLogo
        supply={supply}
        size={isDropea ? size : Math.round(size * 0.82)}
        {...(isDropea ? { className: "size-full object-cover" } : {})}
      />
    </span>
  );
}

export function SupplyName({
  supply,
  className,
}: {
  supply: Supply;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <SupplyMark supply={supply} size={18} />
      {SUPPLY_LABEL[supply]}
    </span>
  );
}

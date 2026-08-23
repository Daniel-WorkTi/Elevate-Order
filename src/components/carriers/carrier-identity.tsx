import { useState } from "react";

import { getCarrierMeta } from "@/lib/carriers";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: { icon: 20, img: "h-5 max-h-5 max-w-[88px]" },
  md: { icon: 28, img: "h-7 max-h-7 max-w-[120px]" },
} as const;

/** InPost / DPD wordmarks read small at default sm — bump slightly. */
const LOGO_BOOST: Record<string, { icon: number; img: string }> = {
  inpost: { icon: 24, img: "h-6 max-h-6 max-w-[108px]" },
  dpd: { icon: 24, img: "h-6 max-h-6 max-w-[108px]" },
};

export function CarrierIdentity({
  carrier,
  size = "sm",
  unavailableLabel = "—",
  unknownLabel = "Sem info",
  className,
}: {
  carrier: string | null | undefined;
  size?: "sm" | "md";
  unavailableLabel?: string;
  unknownLabel?: string;
  className?: string;
}) {
  const resolved = getCarrierMeta(carrier);
  const [failed, setFailed] = useState(false);
  const base = SIZE[size];
  const boost = size === "sm" && resolved.id ? LOGO_BOOST[resolved.id] : undefined;
  const tokens = boost ?? base;
  const showLogo = resolved.known && Boolean(resolved.logo) && !failed;

  if (showLogo) {
    return (
      <span className={cn("inline-flex min-w-0 max-w-full items-center", className)}>
        <img
          src={resolved.logo}
          alt={resolved.name}
          title={resolved.name}
          width={tokens.icon}
          height={tokens.icon}
          className={cn("w-auto shrink-0 object-contain object-left", tokens.img)}
          decoding="async"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  const label = resolved.missing
    ? unavailableLabel
    : resolved.known
      ? resolved.name
      : unknownLabel;

  return (
    <span className={cn("inline-flex min-w-0 max-w-full items-center", className)}>
      <span
        className={cn(
          "truncate",
          (!resolved.known || resolved.missing) && "font-medium text-[#667085]",
        )}
      >
        {label}
      </span>
    </span>
  );
}

export const CarrierBadge = CarrierIdentity;

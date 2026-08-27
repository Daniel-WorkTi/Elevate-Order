import { cn } from "@/lib/utils";

/**
 * Soft card chrome for Products / Summary on the order detail page.
 * Top + sides: solid #E6E8EC that dissolves downward (no muddy opacity).
 * Bottom: blue accent — longer (~78%), 1px thin, fades at tips (not full width).
 */
export function OrderSoftCardChrome({ className }: { className?: string }) {
  return (
    <>
      {/* Canvas fade — behind content */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-0 h-32 bg-gradient-to-b from-transparent via-[#F7F8FA]/50 to-[#F7F8FA]",
          className,
        )}
      />

      {/* Edges above content */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[3]">
        <div className="absolute inset-x-0 top-0 h-px rounded-t-[14px] bg-[#E6E8EC]" />

        <div
          className="absolute bottom-[28%] left-0 top-0 w-px bg-[#E6E8EC]"
          style={{
            maskImage: "linear-gradient(to bottom, #000 0%, #000 42%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 42%, transparent 100%)",
          }}
        />
        <div
          className="absolute bottom-[28%] right-0 top-0 w-px bg-[#E6E8EC]"
          style={{
            maskImage: "linear-gradient(to bottom, #000 0%, #000 42%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 42%, transparent 100%)",
          }}
        />

        {/* Blue bottom accent — longer, thinner; fades at tips */}
        <div className="absolute bottom-0 left-1/2 h-px w-[78%] max-w-none -translate-x-1/2">
          <div
            className="h-full w-full bg-[#2563EB]"
            style={{
              clipPath:
                "polygon(0% 50%, 8% 0%, 50% 0%, 92% 0%, 100% 50%, 92% 100%, 50% 100%, 8% 100%)",
              opacity: 0.85,
              maskImage:
                "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 12%, #000 28%, #000 72%, rgba(0,0,0,0.4) 88%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 12%, #000 28%, #000 72%, rgba(0,0,0,0.4) 88%, transparent 100%)",
            }}
          />
        </div>
      </div>
    </>
  );
}

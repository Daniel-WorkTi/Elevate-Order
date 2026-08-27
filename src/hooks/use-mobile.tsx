import * as React from "react";

const MOBILE_BREAKPOINT = 768;
/** Desktop shell (expanded sidebar) starts at Tailwind `lg`. */
const LG_BREAKPOINT = 1024;

function useMatchMaxWidth(maxWidthPx: number) {
  const [matches, setMatches] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const onChange = () => {
      setMatches(window.innerWidth <= maxWidthPx);
    };
    mql.addEventListener("change", onChange);
    setMatches(window.innerWidth <= maxWidthPx);
    return () => mql.removeEventListener("change", onChange);
  }, [maxWidthPx]);

  return !!matches;
}

/** True below Tailwind `md` (phone). */
export function useIsMobile() {
  return useMatchMaxWidth(MOBILE_BREAKPOINT - 1);
}

/**
 * True below Tailwind `lg` — phone + tablet.
 * Use to keep the sidebar as a 72px rail and compact header controls.
 */
export function useIsBelowLg() {
  return useMatchMaxWidth(LG_BREAKPOINT - 1);
}

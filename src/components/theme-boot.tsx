import { useEffect } from "react";

import { applyTheme, readInitialTheme } from "@/lib/theme/apply-theme";

/** Applies stored theme after hydration to avoid `<html>` SSR mismatches. */
export function ThemeBoot() {
  useEffect(() => {
    applyTheme(readInitialTheme());
  }, []);
  return null;
}

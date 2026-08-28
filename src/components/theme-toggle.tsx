import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";
import { applyTheme, readInitialTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme/apply-theme";

export function ThemeToggle() {
  const t = useT();
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = readInitialTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="rounded-xl"
      aria-label={theme === "dark" ? t("theme.lightMode") : t("theme.darkMode")}
      title={theme === "dark" ? t("theme.lightMode") : t("theme.darkMode")}
    >
      {mounted && theme === "dark" ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </Button>
  );
}

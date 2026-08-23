import { Menu } from "lucide-react";

import { CurrencySwitcher } from "@/components/currency/currency-switcher";
import {
  WorkspaceSwitcher,
  type Workspace,
} from "@/components/app-shell/workspace-switcher";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  title: string;
  subtitle?: string | undefined;
  workspace: Workspace;
  onOpenMobileNav?: (() => void) | undefined;
  className?: string | undefined;
};

export function AppHeader({
  title,
  subtitle,
  workspace,
  onOpenMobileNav,
  className,
}: AppHeaderProps) {
  const t = useT();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-20 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 md:px-8",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {onOpenMobileNav ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-[10px] md:hidden"
            onClick={onOpenMobileNav}
            aria-label={t("shell.openNav")}
          >
            <Menu className="size-5" strokeWidth={1.5} />
          </Button>
        ) : null}

        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-semibold tracking-tight text-foreground md:text-[20px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <CurrencySwitcher />
        <WorkspaceSwitcher workspace={workspace} tone="header" />
      </div>
    </header>
  );
}

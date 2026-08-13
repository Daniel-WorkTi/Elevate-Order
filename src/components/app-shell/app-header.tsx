import { Menu } from "lucide-react";

import { CurrencySwitcher } from "@/components/app-shell/currency-switcher";
import { HeaderAvatar, type Operator } from "@/components/app-shell/user-menu";
import { useExchangeRate } from "@/components/app-shell/use-exchange-rate";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  title: string;
  subtitle?: string | undefined;
  operator: Operator;
  onOpenMobileNav?: (() => void) | undefined;
  className?: string | undefined;
  currency?:
    | {
        from?: string | undefined;
        to?: string | undefined;
        rate?: number | null | undefined;
        updatedAt?: Date | string | null | undefined;
      }
    | undefined;
};

export function AppHeader({
  title,
  subtitle,
  operator,
  onOpenMobileNav,
  className,
  currency,
}: AppHeaderProps) {
  const live = useExchangeRate(currency?.from ?? "EUR", currency?.to ?? "BRL");
  const from = currency?.from ?? "EUR";
  const to = currency?.to ?? "BRL";
  const rate = currency?.rate !== undefined ? currency.rate : live.rate;
  const updatedAt = currency?.updatedAt !== undefined ? currency.updatedAt : live.updatedAt;

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
            aria-label="Open navigation"
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
        <CurrencySwitcher
          from={from}
          to={to}
          rate={rate}
          updatedAt={updatedAt}
          className="hidden sm:flex"
        />
        <HeaderAvatar operator={operator} />
      </div>
    </header>
  );
}

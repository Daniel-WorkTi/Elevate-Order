import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, LogOut, Settings } from "lucide-react";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAuth } from "@/lib/auth/session.functions";
import { signOut } from "@/lib/auth/social-login";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export type Operator = {
  name: string;
  role: string;
  initials: string;
};

type UserMenuProps = {
  operator: Operator;
  collapsed?: boolean;
  className?: string;
};

export function UserMenu({ operator, collapsed = false, className }: UserMenuProps) {
  const t = useT();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      try {
        await signOutAuth();
      } catch {
        // Browser sign-out already cleared the session; server clear is best-effort.
      }
      await navigate({ to: "/login", search: {} });
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-[12px] text-left transition-colors duration-150",
            "hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/50",
            collapsed ? "justify-center px-2 py-2" : "px-2.5 py-2",
            className,
          )}
          aria-label={`${t("shell.account")} — ${operator.name}`}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[color:var(--elevate-blue)] text-[11px] font-semibold text-white">
            {operator.initials}
          </span>
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-white">
                  {operator.name}
                </span>
                <span className="block truncate text-[11px] text-[color:var(--sidebar-muted)]">
                  {operator.role}
                </span>
              </span>
              <ChevronRight
                className="size-3.5 shrink-0 text-[color:var(--sidebar-muted)]"
                strokeWidth={1.5}
              />
            </>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="w-[220px] rounded-[14px] border-border p-1 shadow-sm"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-normal text-muted-foreground">
          {t("shell.account")}
        </DropdownMenuLabel>
        <DropdownMenuItem asChild className="rounded-[8px] text-[13px]">
          <Link to="/settings">
            <Settings className="size-3.5" strokeWidth={1.5} />
            {t("shell.settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="rounded-[8px] text-[13px] text-muted-foreground"
          disabled={signingOut}
          onSelect={(event) => {
            event.preventDefault();
            void onSignOut();
          }}
        >
          <LogOut className="size-3.5" strokeWidth={1.5} />
          {signingOut ? t("shell.signingOut") : t("shell.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function HeaderAvatar({ operator }: { operator: Operator }) {
  return (
    <span
      className="grid size-8 place-items-center rounded-full bg-[color:var(--elevate-blue)] text-[11px] font-semibold text-white"
      aria-label={operator.name}
      title={operator.name}
    >
      {operator.initials}
    </span>
  );
}

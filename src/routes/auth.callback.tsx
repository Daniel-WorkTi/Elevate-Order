import { createFileRoute, redirect } from "@tanstack/react-router";

import { exchangeAuthCode } from "@/lib/auth/session.functions";
import { useT } from "@/lib/i18n/locale-context";

type CallbackSearch = {
  code?: string;
  error?: string;
};

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => {
    // Only keep what we need; ignore error_description and other provider noise in the bar.
    const next: CallbackSearch = {};
    if (typeof search["code"] === "string") next.code = search["code"];
    if (typeof search["error"] === "string") next.error = search["error"];
    return next;
  },
  beforeLoad: async ({ search }) => {
    if (search.error || !search.code) {
      throw redirect({
        to: "/login",
        search: { error: "oauth" },
        replace: true,
      });
    }

    try {
      await exchangeAuthCode({ data: { code: search.code } });
    } catch {
      throw redirect({
        to: "/login",
        search: { error: "oauth" },
        replace: true,
      });
    }

    // First landing after login: onboarding (root gate skips if already done).
    throw redirect({ to: "/onboarding", replace: true });
  },
  component: AuthCallbackPending,
});

function AuthCallbackPending() {
  const t = useT();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F7F8FA]">
      <p className="text-[14px] text-[#667085]">{t("auth.signingIn")}</p>
    </div>
  );
}

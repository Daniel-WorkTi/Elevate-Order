import { createFileRoute, redirect } from "@tanstack/react-router";

import { startGoogleOAuth } from "@/lib/auth/session.functions";
import { useT } from "@/lib/i18n/locale-context";

type GoogleSearch = {
  origin?: string;
};

/**
 * Starts Google OAuth via server RPC so authorize URL / client_id
 * are never constructed in client route modules.
 * `?origin=` comes from the browser so localhost login stays local.
 */
export const Route = createFileRoute("/auth/google")({
  validateSearch: (search: Record<string, unknown>): GoogleSearch => {
    const next: GoogleSearch = {};
    if (typeof search["origin"] === "string" && search["origin"].length > 0) {
      next.origin = search["origin"];
    }
    return next;
  },
  beforeLoad: async ({ search }) => {
    let url: string;
    try {
      ({ url } = await startGoogleOAuth({
        data: search.origin ? { origin: search.origin } : {},
      }));
    } catch {
      throw redirect({
        to: "/login",
        search: { error: "oauth" },
        replace: true,
      });
    }

    throw redirect({ href: url });
  },
  component: AuthGooglePending,
});

function AuthGooglePending() {
  const t = useT();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F7F8FA]">
      <p className="text-[14px] text-[#667085]">{t("auth.connecting")}</p>
    </div>
  );
}

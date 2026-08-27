import { createServerFn } from "@tanstack/react-start";

import { getAuthUser } from "@/lib/auth/session.functions";
import {
  isOnboardingCompleteForUser,
  markOnboardingCompleteClient,
  ONBOARDING_DONE_COOKIE,
  parseOnboardingDoneUsers,
  serializeOnboardingDoneUsers,
  shouldShowOnboarding,
} from "@/lib/onboarding/onboarding-state";

export type OnboardingGate = {
  needsOnboarding: boolean;
  userId: string | null;
};

/** Server-readable onboarding status for the signed-in user. */
export const getOnboardingGate = createServerFn({ method: "GET" }).handler(
  async (): Promise<OnboardingGate> => {
    const user = await getAuthUser();
    if (!user) return { needsOnboarding: false, userId: null };

    const { getCookies } = await import("@tanstack/react-start/server");
    const cookieValue = getCookies()[ONBOARDING_DONE_COOKIE];
    return {
      userId: user.id,
      needsOnboarding: shouldShowOnboarding({
        userId: user.id,
        createdAt: user.createdAt,
        cookieValue,
      }),
    };
  },
);

/** Persist completion in httpOnly-friendly cookie (readable by beforeLoad). */
export const completeOnboarding = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true }> => {
    const user = await getAuthUser();
    if (!user) return { ok: true };

    const { getCookies, setCookie } = await import("@tanstack/react-start/server");
    const users = parseOnboardingDoneUsers(getCookies()[ONBOARDING_DONE_COOKIE]);
    users.add(user.id);
    setCookie(ONBOARDING_DONE_COOKIE, serializeOnboardingDoneUsers(users), {
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
      sameSite: "lax",
      httpOnly: false,
      secure: process.env["NODE_ENV"] === "production",
    });

    return { ok: true };
  },
);

/** Client helper: server cookie + localStorage. */
export async function finishOnboardingClient(userId: string | null | undefined) {
  if (userId) markOnboardingCompleteClient(userId);
  try {
    await completeOnboarding();
  } catch {
    // ignore — local cookie still set
  }
}

export function readOnboardingCookieFromRequestCookies(
  cookies: Record<string, string | undefined>,
  userId: string,
): boolean {
  return isOnboardingCompleteForUser(cookies[ONBOARDING_DONE_COOKIE], userId);
}

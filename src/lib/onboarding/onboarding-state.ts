/** Cookie + helpers: first-login onboarding gate. */

export const ONBOARDING_DONE_COOKIE = "elevate_onboarding_done";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 400; // ~13 months

/** Cookie value lists completed user ids separated by `|`. */
export function parseOnboardingDoneUsers(raw: string | undefined | null): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

export function serializeOnboardingDoneUsers(users: Set<string>): string {
  return [...users].join("|");
}

export function isOnboardingCompleteForUser(
  cookieValue: string | undefined | null,
  userId: string,
): boolean {
  return parseOnboardingDoneUsers(cookieValue).has(userId);
}

/** Client: mark onboarding finished for this account. */
export function markOnboardingCompleteClient(userId: string) {
  if (typeof document === "undefined" || !userId) return;
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${ONBOARDING_DONE_COOKIE}=`));
    const current = match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
    const users = parseOnboardingDoneUsers(current);
    users.add(userId);
    const value = encodeURIComponent(serializeOnboardingDoneUsers(users));
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ONBOARDING_DONE_COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
    window.localStorage.setItem(`${ONBOARDING_DONE_COOKIE}:${userId}`, "1");
  } catch {
    // ignore
  }
}

export function readOnboardingCompleteClient(userId: string): boolean {
  if (typeof window === "undefined" || !userId) return false;
  try {
    if (window.localStorage.getItem(`${ONBOARDING_DONE_COOKIE}:${userId}`) === "1") return true;
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${ONBOARDING_DONE_COOKIE}=`));
    const current = match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
    return isOnboardingCompleteForUser(current, userId);
  } catch {
    return false;
  }
}

/** Accounts older than this are grandfathered (no forced onboarding). */
export const ONBOARDING_NEW_ACCOUNT_MS = 1000 * 60 * 60 * 24 * 2; // 48h

export function isNewAccount(createdAt: string | null | undefined): boolean {
  if (!createdAt) return true;
  const ts = new Date(createdAt).getTime();
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts < ONBOARDING_NEW_ACCOUNT_MS;
}

export function shouldShowOnboarding(input: {
  userId: string;
  createdAt: string | null | undefined;
  cookieValue: string | undefined | null;
}): boolean {
  if (isOnboardingCompleteForUser(input.cookieValue, input.userId)) return false;
  return isNewAccount(input.createdAt);
}

/** Paths allowed while onboarding is still pending. */
export function isOnboardingExemptPath(pathname: string): boolean {
  return (
    pathname === "/onboarding" ||
    pathname.startsWith("/connections/whatsapp") ||
    pathname.startsWith("/auth/") ||
    pathname === "/login" ||
    pathname.startsWith("/api/")
  );
}

/** Start Google OAuth via server route (keeps authorize URL out of client app code). */
export async function startGoogleLogin(): Promise<void> {
  window.location.assign("/auth/google");
}

/** Sign out (browser cookies). */
export async function signOut(): Promise<void> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.auth.signOut();
  if (error) {
    // Do not log provider/API details in the browser console.
    console.error("[auth] signOut failed");
  }
}

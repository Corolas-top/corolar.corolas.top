import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let adminSession: { access_token: string; refresh_token: string; expires_at: number } | null = null;
let loginPromise: Promise<void> | null = null;

async function doLogin(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: env.supabaseAdminEmail,
    password: env.supabaseAdminPassword,
  });
  if (error || !data.session) {
    throw new Error(`Supabase auth failed: ${error?.message ?? "no session"}`);
  }
  adminSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
  };
  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}

export async function db() {
  if (!adminSession) {
    if (!loginPromise) loginPromise = doLogin();
    await loginPromise;
    loginPromise = null;
  } else {
    const now = Math.floor(Date.now() / 1000);
    if (adminSession.expires_at - now < 300) {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: adminSession.refresh_token,
      });
      if (error || !data.session) {
        await doLogin();
      } else {
        adminSession = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at ?? now + 3600,
        };
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
    } else {
      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });
    }
  }
  return supabase;
}

import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// Create Supabase client with anon key (RLS-enforced)
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
  },
});

let sessionCache: {
  access_token: string;
  refresh_token: string;
  expires_at: number;
} | null = null;

async function loginAdmin(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: env.supabaseAdminEmail,
    password: env.supabaseAdminPassword,
  });

  if (error || !data.session) {
    throw new Error(`Supabase admin login failed: ${error?.message ?? "no session"}`);
  }

  sessionCache = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
  };

  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  console.log("[Supabase] Admin authenticated successfully");
}

async function refreshIfNeeded(): Promise<void> {
  if (!sessionCache) {
    await loginAdmin();
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  // Refresh if token expires in less than 5 minutes
  if (sessionCache.expires_at - now < 300) {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: sessionCache.refresh_token,
    });
    if (error || !data.session) {
      console.warn("[Supabase] Refresh failed, re-logging in...");
      await loginAdmin();
      return;
    }
    sessionCache = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? now + 3600,
    };
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }
}

// Initialize on first use
let initialized = false;
export async function initSupabaseAuth(): Promise<void> {
  if (initialized) return;
  await loginAdmin();
  initialized = true;
}

// Call this before each database operation to ensure valid session
export async function ensureAuth(): Promise<void> {
  if (!initialized) {
    await initSupabaseAuth();
    return;
  }
  await refreshIfNeeded();
}

export async function db() {
  await ensureAuth();
  return supabase;
}

// Helper type for database rows
export type DbResult<T> = T extends PromiseLike<infer U> ? U : never;

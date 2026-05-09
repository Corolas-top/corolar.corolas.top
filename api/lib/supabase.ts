import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

function createSupabaseClient() {
  const url = env.supabaseUrl;
  const key = env.supabasePublishableKey;
  if (!url || !key) {
    console.error("[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  }
  return createClient(url || "https://placeholder.supabase.co", key || "placeholder", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const supabase = createSupabaseClient();

export { supabase };

export async function verifyToken(token: string) {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  } catch (e) {
    console.error("[verifyToken]", e);
    return null;
  }
}

export async function db() {
  return supabase;
}

import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function verifyToken(token: string) {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function db() {
  return supabase;
}

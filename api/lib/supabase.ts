import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper type for database rows
export type DbResult<T> = T extends PromiseLike<infer U> ? U : never;

import "dotenv/config";

function get(name: string): string {
  const v = process.env[name];
  if (process.env.NODE_ENV === "production" && !v) throw new Error(`Missing env: ${name}`);
  return v ?? "";
}

export const env = {
  appSecret: get("APP_SECRET") || "corolar-default-secret",
  supabaseUrl: get("VITE_SUPABASE_URL") || get("SUPABASE_URL") || "",
  supabasePublishableKey: get("VITE_SUPABASE_PUBLISHABLE_KEY") || get("SUPABASE_PUBLISHABLE_KEY") || "",
  isDev: process.env.NODE_ENV !== "production",
};

import "dotenv/config";

function get(name: string): string {
  // Read env var; on Vercel process.env is injected at runtime, so never throw
  return process.env[name] ?? "";
}

export const env = {
  appSecret: get("APP_SECRET") || "corolar-default-secret",
  supabaseUrl: get("VITE_SUPABASE_URL") || get("SUPABASE_URL") || "",
  supabasePublishableKey: get("VITE_SUPABASE_PUBLISHABLE_KEY") || get("SUPABASE_PUBLISHABLE_KEY") || "",
  masterKey: get("VITE_MASTER_KEY") || get("MASTER_KEY") || "",
  isDev: process.env.NODE_ENV !== "production",
};

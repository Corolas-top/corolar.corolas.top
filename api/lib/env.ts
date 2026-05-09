import "dotenv/config";

function get(name: string): string {
  const v = process.env[name];
  if (process.env.NODE_ENV === "production" && !v) {
    throw new Error(`Missing env: ${name}`);
  }
  return v ?? "";
}

export const env = {
  appSecret: get("APP_SECRET") || "corolar-default-secret",
  supabaseUrl: get("SUPABASE_URL"),
  supabasePublishableKey: get("SUPABASE_PUBLISHABLE_KEY"),
  supabaseAdminEmail: get("SUPABASE_ADMIN_EMAIL"),
  supabaseAdminPassword: get("SUPABASE_ADMIN_PASSWORD"),
  adminMasterKey: get("ADMIN_MASTER_KEY") || "corolar_1qazxsw23edcvfr45tgbnhy67ujmki89olp0",
  isDev: process.env.NODE_ENV !== "production",
};

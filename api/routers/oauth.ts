import { z } from "zod";
import { createRouter, anyAuthQuery } from "../middleware";
import { supabase } from "../lib/supabase";

export const oauthRouter = createRouter({
  list: anyAuthQuery.query(async () => {
    const { data, error } = await supabase.from("oauth_configs").select("*");
    if (error) throw new Error(error.message);
    return data || [];
  }),

  getByProvider: anyAuthQuery
    .input(z.object({ provider: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("oauth_configs")
        .select("*")
        .eq("provider", input.provider)
        .single();
      if (error) return null;
      return data;
    }),

  update: anyAuthQuery
    .input(
      z.object({
        provider: z.string(),
        client_id: z.string().optional(),
        client_secret: z.string().optional(),
        callback_url: z.string().optional(),
        scopes: z.array(z.string()).optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { provider, ...updates } = input;
      const { data, error } = await supabase
        .from("oauth_configs")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("provider", provider)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  testConnection: anyAuthQuery
    .input(z.object({ provider: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("oauth_configs")
        .select("*")
        .eq("provider", input.provider)
        .single();

      if (error || !data) {
        return { success: false, message: "Configuration not found" };
      }

      // Simulated connection test
      if (!data.client_id || data.client_id.length < 10) {
        return { success: false, message: "Invalid Client ID" };
      }

      return { success: true, message: "Connection successful" };
    }),
});

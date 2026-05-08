import { z } from "zod";
import bcrypt from "bcryptjs";
import { createRouter, adminQuery, agentQuery } from "../middleware";
import { supabase } from "../lib/supabase";

async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabase.from("admin_settings").select("value").eq("key", key).single();
  return data?.value || null;
}

async function setSetting(key: string, value: string) {
  await supabase.from("admin_settings").upsert({ key, value, updated_at: new Date().toISOString() });
}

export const agentRouter = createRouter({
  getStatus: adminQuery.query(async () => {
    const enabled = (await getSetting("agent_enabled")) === "true";
    const permsStr = await getSetting("agent_permissions");
    const permissions = permsStr ? JSON.parse(permsStr) : {};

    // Get today's call count
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("agent_access_logs")
      .select("*", { count: "exact" })
      .gte("created_at", today);

    // Get last access
    const { data: lastLog } = await supabase
      .from("agent_access_logs")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return {
      enabled,
      lastAccess: lastLog?.created_at || null,
      todayCalls: count || 0,
      permissions,
    };
  }),

  updatePassword: adminQuery
    .input(z.object({ currentPassword: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const hash = await getSetting("agent_password_hash");
      if (!hash) throw new Error("Agent not configured");

      const valid = await bcrypt.compare(input.currentPassword, hash);
      if (!valid) throw new Error("Current password is incorrect");

      const newHash = await bcrypt.hash(input.newPassword, 12);
      await setSetting("agent_password_hash", newHash);
      return { success: true };
    }),

  updatePermissions: adminQuery
    .input(z.object({ permissions: z.record(z.string(), z.boolean()) }))
    .mutation(async ({ input }) => {
      await setSetting("agent_permissions", JSON.stringify(input.permissions));
      return { success: true };
    }),

  toggleEnabled: adminQuery
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      await setSetting("agent_enabled", String(input.enabled));
      return { success: true };
    }),

  getLogs: adminQuery
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20), action: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const { page = 1, limit = 20, action } = input || {};
      let query = supabase.from("agent_access_logs").select("*", { count: "exact" });
      if (action) query = query.eq("action", action);

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, error, count } = await query
        .range(from, to)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return { items: data || [], total: count || 0 };
    }),

  // Agent-side: log an action
  logAction: agentQuery
    .input(z.object({ action: z.string(), resource: z.string(), result: z.string().default("success"), ip: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { error } = await supabase.from("agent_access_logs").insert(input);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
});

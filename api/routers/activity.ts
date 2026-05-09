import { z } from "zod";
import { createRouter, anyAuthQuery } from "../middleware";
import { db } from "../lib/supabase";

export const activityRouter = createRouter({
  list: anyAuthQuery
    .input(
      z
        .object({
          page: z.number().default(1),
          limit: z.number().default(20),
          actorType: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, actorType } = input || {};
      const s = await db();
      let query = s.from("activity_logs").select("*", { count: "exact" });
      if (actorType) query = query.eq("actor_type", actorType);

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, error, count } = await query.range(from, to).order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return { items: data || [], total: count || 0 };
    }),

  recent: anyAuthQuery
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit || 10;
      const s = await db();
      const { data, error } = await s
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return data || [];
    }),

  stats: anyAuthQuery.query(async () => {
    const s = await db();
    const today = new Date().toISOString().split("T")[0];
    const { count: totalToday } = await s
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today);

    return { totalToday: totalToday || 0, byAction: {} as Record<string, number> };
  }),
});

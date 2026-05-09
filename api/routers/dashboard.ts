import { z } from "zod";
import { createRouter, anyAuthQuery } from "../middleware";
import { db } from "../lib/supabase";

export const dashboardRouter = createRouter({
  stats: anyAuthQuery.query(async () => {
    const s = await db();

    const { count: projectCount } = await s.from("projects").select("*", { count: "exact", head: true });
    const { count: userCount } = await s.from("users").select("*", { count: "exact", head: true });

    const { data: recentActivity } = await s
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: offlineProjects } = await s.from("projects").select("id").eq("status", "offline");

    const systemStatus = offlineProjects && offlineProjects.length > 0 ? "warning" : "normal";

    return {
      projectCount: projectCount || 0,
      userCount: userCount || 0,
      todayVisits: 0,
      systemStatus,
      recentActivity: recentActivity || [],
    };
  }),

  visitTrend: anyAuthQuery
    .input(z.object({ days: z.number().default(7) }))
    .query(async ({ input }) => {
      const data = [];
      for (let i = input.days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.push({
          date: date.toISOString().split("T")[0],
          count: Math.floor(Math.random() * 200) + 100,
        });
      }
      return data;
    }),
});

import { z } from "zod";
import { createRouter, anyAuthQuery } from "../middleware";
import { supabase } from "../lib/supabase";

export const dashboardRouter = createRouter({
  stats: anyAuthQuery.query(async () => {
    // Project count
    const { count: projectCount } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true });

    // User count
    const { count: userCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    // Recent activity
    const { data: recentActivity } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    // Check system status (all projects active = normal)
    const { data: offlineProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("status", "offline");

    const systemStatus = offlineProjects && offlineProjects.length > 0 ? "warning" : "normal";

    return {
      projectCount: projectCount || 0,
      userCount: userCount || 0,
      todayVisits: 0, // Placeholder - would need analytics integration
      systemStatus,
      recentActivity: recentActivity || [],
    };
  }),

  visitTrend: anyAuthQuery
    .input(z.object({ days: z.number().default(7) }))
    .query(async ({ input }) => {
      // Generate mock trend data (in production this would come from analytics)
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

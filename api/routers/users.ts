import { z } from "zod";
import { createRouter, anyAuthQuery } from "../middleware";
import { db } from "../lib/supabase";

export const usersRouter = createRouter({
  list: anyAuthQuery
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        search: z.string().optional(),
        source: z.string().optional(),
        status: z.string().optional(),
      }).optional(),
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, search, source, status } = input || {};
      const s = await db();
      let query = s.from("users").select("*", { count: "exact" });

      if (search) {
        query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
      }
      if (source) query = query.eq("source_project", source);
      if (status) query = query.eq("status", status);

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, error, count } = await query.range(from, to).order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return {
        items: data || [],
        total: count || 0,
        page,
        pages: Math.ceil((count || 0) / limit),
      };
    }),

  getById: anyAuthQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const s = await db();
      const { data, error } = await s.from("users").select("*").eq("id", input.id).single();
      if (error) return null;
      return data;
    }),

  updateStatus: anyAuthQuery
    .input(z.object({ id: z.number(), status: z.enum(["active", "banned", "pending"]) }))
    .mutation(async ({ input }) => {
      const s = await db();
      const { data, error } = await s
        .from("users")
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  delete: anyAuthQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const s = await db();
      const { error } = await s.from("users").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  stats: anyAuthQuery.query(async () => {
    const s = await db();
    const { count: total } = await s.from("users").select("*", { count: "exact", head: true });
    const { count: active } = await s.from("users").select("*", { count: "exact", head: true }).eq("status", "active");
    const { count: banned } = await s.from("users").select("*", { count: "exact", head: true }).eq("status", "banned");
    return { total: total || 0, active: active || 0, banned: banned || 0, byProject: {} as Record<string, number> };
  }),
});

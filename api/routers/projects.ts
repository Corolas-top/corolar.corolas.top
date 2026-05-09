import { z } from "zod";
import { createRouter, anyAuthQuery } from "../middleware";
import { db } from "../lib/supabase";

export const projectsRouter = createRouter({
  list: anyAuthQuery.query(async () => {
    const s = await db();
    const { data, error } = await s.from("projects").select("*").order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }),

  getById: anyAuthQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const s = await db();
      const { data, error } = await s.from("projects").select("*").eq("id", input.id).single();
      if (error) return null;
      return data;
    }),

  create: anyAuthQuery
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        url: z.string().min(1),
        overview: z.string().optional(),
        description: z.string().optional(),
        logo_url: z.string().optional(),
        status: z.enum(["active", "maintenance", "development", "offline"]).default("development"),
        sort_order: z.number().default(0),
      }),
    )
    .mutation(async ({ input }) => {
      const s = await db();
      const { data, error } = await s.from("projects").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data;
    }),

  update: anyAuthQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        slug: z.string().optional(),
        url: z.string().optional(),
        overview: z.string().optional(),
        description: z.string().optional(),
        logo_url: z.string().optional(),
        status: z.enum(["active", "maintenance", "development", "offline"]).optional(),
        sort_order: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const s = await db();
      const { data, error } = await s
        .from("projects")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  delete: anyAuthQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const s = await db();
      const { error } = await s.from("projects").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
});

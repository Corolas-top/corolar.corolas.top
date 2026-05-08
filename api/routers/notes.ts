import { z } from "zod";
import { createRouter, anyAuthQuery } from "../middleware";
import { supabase } from "../lib/supabase";

export const notesRouter = createRouter({
  list: anyAuthQuery.query(async () => {
    const { data, error } = await supabase
      .from("encrypted_notes")
      .select("id, title, updated_at, created_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }),

  getById: anyAuthQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("encrypted_notes")
        .select("*")
        .eq("id", input.id)
        .single();
      if (error) return null;
      return data;
    }),

  create: anyAuthQuery
    .input(
      z.object({
        title: z.string().default("Untitled"),
        encrypted_content: z.string(),
        iv: z.string(),
        salt: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { data, error } = await supabase
        .from("encrypted_notes")
        .insert(input)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  update: anyAuthQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        encrypted_content: z.string().optional(),
        iv: z.string().optional(),
        salt: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("encrypted_notes")
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
      const { error } = await supabase.from("encrypted_notes").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
});

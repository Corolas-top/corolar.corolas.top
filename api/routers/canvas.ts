import { z } from "zod";
import { createRouter, anyAuthQuery } from "../middleware";
import { supabase } from "../lib/supabase";

export const canvasRouter = createRouter({
  get: anyAuthQuery.query(async () => {
    const { data, error } = await supabase
      .from("canvas_data")
      .select("*")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Return empty canvas if no data
      return { id: 0, elements: [], version: 0 };
    }
    return { id: data.id, elements: data.elements || [], version: data.version };
  }),

  save: anyAuthQuery
    .input(z.object({ elements: z.array(z.record(z.string(), z.any())) }))
    .mutation(async ({ input }) => {
      // Upsert: if id 1 exists, update; else insert
      const { data: existing } = await supabase
        .from("canvas_data")
        .select("id, version")
        .eq("id", 1)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from("canvas_data")
          .update({
            elements: input.elements,
            version: (existing.version || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return { id: data.id, version: data.version };
      } else {
        const { data, error } = await supabase
          .from("canvas_data")
          .insert({ elements: input.elements, version: 1 })
          .select()
          .single();
        if (error) throw new Error(error.message);
        return { id: data.id, version: data.version };
      }
    }),
});

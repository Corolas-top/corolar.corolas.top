import { router, publicProc, authedProc } from "./middleware";
import { z } from "zod";
import { db } from "./lib/supabase";

function id(): string {
  return "cpid_" + Array.from({ length: 12 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)]).join("") + Date.now().toString(36);
}

const appRouter = router({
  ping: publicProc.query(() => ({ ok: true })),

  auth: router({
    me: publicProc.query(async ({ ctx }) => {
      const token = ctx.req.headers.get("x-auth-token");
      if (!token) return null;
      const { supabase } = await import("./lib/supabase");
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) return null;
      return { id: data.user.id, email: data.user.email };
    }),
  }),

  dashboard: router({
    stats: authedProc.query(async () => {
      const s = await db();
      const [{ count: pc }, { count: uc }, { data: recent }] = await Promise.all([
        s.from("projects").select("*", { count: "exact", head: true }),
        s.from("users").select("*", { count: "exact", head: true }),
        s.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8),
      ]);
      return { projectCount: pc ?? 0, userCount: uc ?? 0, recentActivity: recent ?? [] };
    }),
  }),

  projects: router({
    list: authedProc.query(async () => {
      const s = await db();
      const { data, error } = await s.from("projects").select("*").order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
    create: authedProc
      .input(z.object({
        name: z.string().min(1), slug: z.string().min(1), url: z.string().min(1),
        overview: z.string().optional(), description: z.string().optional(),
        logo_url: z.string().optional(), status: z.enum(["active","maintenance","development","offline"]).default("development"),
        sort_order: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const s = await db();
        const corolas_project_id = id();
        const { data, error } = await s.from("projects").insert({ ...input, corolas_project_id }).select().single();
        if (error) throw new Error(error.message);
        return data;
      }),
    update: authedProc
      .input(z.object({ id: z.number(), name: z.string().optional(), slug: z.string().optional(), url: z.string().optional(), overview: z.string().optional(), description: z.string().optional(), logo_url: z.string().optional(), status: z.enum(["active","maintenance","development","offline"]).optional(), sort_order: z.number().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...u } = input;
        const s = await db();
        const { data, error } = await s.from("projects").update({ ...u, updated_at: new Date().toISOString() }).eq("id", id).select().single();
        if (error) throw new Error(error.message);
        return data;
      }),
    delete: authedProc.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const s = await db();
      const { error } = await s.from("projects").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
  }),

  users: router({
    list: authedProc.input(z.object({ page: z.number().default(1), limit: z.number().default(20), search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const { page = 1, limit = 20, search } = input ?? {};
        const s = await db();
        let q = s.from("users").select("*", { count: "exact" });
        if (search) q = q.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
        const { data, error, count } = await q.range((page-1)*limit, page*limit-1).order("created_at", { ascending: false });
        if (error) throw new Error(error.message);
        return { items: data ?? [], total: count ?? 0, page, pages: Math.ceil((count??0)/limit) };
      }),
    updateStatus: authedProc.input(z.object({ id: z.number(), status: z.enum(["active","banned","pending"]) }))
      .mutation(async ({ input }) => {
        const s = await db();
        const { data, error } = await s.from("users").update({ status: input.status, updated_at: new Date().toISOString() }).eq("id", input.id).select().single();
        if (error) throw new Error(error.message);
        return data;
      }),
    delete: authedProc.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const s = await db();
      const { error } = await s.from("users").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
  }),

  oauth: router({
    list: authedProc.query(async () => {
      const s = await db();
      const { data, error } = await s.from("oauth_configs").select("*");
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
    update: authedProc.input(z.object({ provider: z.string(), client_id: z.string().optional(), client_secret: z.string().optional(), callback_url: z.string().optional(), scopes: z.array(z.string()).optional(), enabled: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const { provider, ...u } = input;
        const s = await db();
        const { data, error } = await s.from("oauth_configs").update({ ...u, updated_at: new Date().toISOString() }).eq("provider", provider).select().single();
        if (error) throw new Error(error.message);
        return data;
      }),
  }),

  agent: router({
    getStatus: authedProc.query(async () => {
      const s = await db();
      const { data: settings } = await s.from("admin_settings").select("key,value");
      const map: Record<string, string> = {};
      (settings ?? []).forEach((r: Record<string, unknown>) => { map[String(r.key)] = String(r.value); });
      const today = new Date().toISOString().split("T")[0];
      const { count } = await s.from("agent_access_logs").select("*", { count: "exact" }).gte("created_at", today);
      const { data: lastLog } = await s.from("agent_access_logs").select("created_at").order("created_at", { ascending: false }).limit(1).single();
      return {
        enabled: map["agent_enabled"] === "true",
        lastAccess: (lastLog as Record<string, string> | null)?.created_at ?? null,
        todayCalls: count ?? 0,
        permissions: map["agent_permissions"] ? JSON.parse(map["agent_permissions"]) : {},
      };
    }),
    updatePassword: authedProc.input(z.object({ currentPassword: z.string(), newPassword: z.string().min(6) }))
      .mutation(async ({ input }) => {
        const { default: bcrypt } = await import("bcryptjs");
        const s = await db();
        const { data } = await s.from("admin_settings").select("value").eq("key", "agent_password_hash").single();
        const hash = data?.value as string;
        if (!hash) throw new Error("Agent not configured");
        if (!await bcrypt.compare(input.currentPassword, hash)) throw new Error("Wrong password");
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await s.from("admin_settings").upsert({ key: "agent_password_hash", value: newHash, updated_at: new Date().toISOString() });
        return { success: true };
      }),
    updatePermissions: authedProc.input(z.object({ permissions: z.record(z.string(), z.boolean()) }))
      .mutation(async ({ input }) => {
        const s = await db();
        await s.from("admin_settings").upsert({ key: "agent_permissions", value: JSON.stringify(input.permissions), updated_at: new Date().toISOString() });
        return { success: true };
      }),
    toggleEnabled: authedProc.input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        const s = await db();
        await s.from("admin_settings").upsert({ key: "agent_enabled", value: String(input.enabled), updated_at: new Date().toISOString() });
        return { success: true };
      }),
    getLogs: authedProc.input(z.object({ page: z.number().default(1), limit: z.number().default(20) }).optional())
      .query(async ({ input }) => {
        const { page = 1, limit = 20 } = input ?? {};
        const s = await db();
        const { data, error, count } = await s.from("agent_access_logs").select("*", { count: "exact" }).range((page-1)*limit, page*limit-1).order("created_at", { ascending: false });
        if (error) throw new Error(error.message);
        return { items: data ?? [], total: count ?? 0 };
      }),
  }),

  canvas: router({
    get: authedProc.query(async () => {
      const s = await db();
      const { data, error } = await s.from("canvas_data").select("*").order("id", { ascending: false }).limit(1).single();
      if (error) return { id: 0, elements: [], version: 0 };
      return { id: data.id, elements: data.elements ?? [], version: data.version };
    }),
    save: authedProc.input(z.object({ elements: z.array(z.record(z.string(), z.any())) }))
      .mutation(async ({ input }) => {
        const s = await db();
        const { data: existing } = await s.from("canvas_data").select("id, version").eq("id", 1).single();
        if (existing) {
          const { data, error } = await s.from("canvas_data").update({ elements: input.elements, version: existing.version + 1, updated_at: new Date().toISOString() }).eq("id", 1).select().single();
          if (error) throw new Error(error.message);
          return { id: data.id, version: data.version };
        }
        const { data, error } = await s.from("canvas_data").insert({ elements: input.elements, version: 1 }).select().single();
        if (error) throw new Error(error.message);
        return { id: data.id, version: data.version };
      }),
  }),

  notes: router({
    list: authedProc.query(async () => {
      const s = await db();
      const { data, error } = await s.from("encrypted_notes").select("id, title, updated_at, created_at").order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
    getById: authedProc.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const s = await db();
      const { data, error } = await s.from("encrypted_notes").select("*").eq("id", input.id).single();
      if (error) return null;
      return data;
    }),
    create: authedProc.input(z.object({ title: z.string().default("Untitled"), encrypted_content: z.string(), iv: z.string(), salt: z.string() }))
      .mutation(async ({ input }) => {
        const s = await db();
        const { data, error } = await s.from("encrypted_notes").insert(input).select().single();
        if (error) throw new Error(error.message);
        return data;
      }),
    update: authedProc.input(z.object({ id: z.number(), title: z.string().optional(), encrypted_content: z.string().optional(), iv: z.string().optional(), salt: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...u } = input;
        const s = await db();
        const { data, error } = await s.from("encrypted_notes").update({ ...u, updated_at: new Date().toISOString() }).eq("id", id).select().single();
        if (error) throw new Error(error.message);
        return data;
      }),
    delete: authedProc.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const s = await db();
      const { error } = await s.from("encrypted_notes").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
export { appRouter };

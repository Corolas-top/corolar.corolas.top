import { router, publicProc, authedProc } from "./middleware";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./lib/env";
import { db } from "./lib/supabase";
import { TRPCError } from "@trpc/server";

const secret = new TextEncoder().encode(env.appSecret);

async function getSetting(key: string): Promise<string | null> {
  const s = await db();
  const { data } = await s.from("admin_settings").select("value").eq("key", key).single();
  return data?.value ?? null;
}

async function setSetting(key: string, value: string) {
  const s = await db();
  await s.from("admin_settings").upsert({ key, value, updated_at: new Date().toISOString() });
}

const appRouter = router({
  ping: publicProc.query(() => ({ ok: true })),

  auth: router({
    login: publicProc
      .input(z.object({ password: z.string(), masterKey: z.string().optional(), isAgent: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        // Check master key
        const storedMasterKey = await getSetting("admin_master_key");
        const masterKey = storedMasterKey || env.adminMasterKey;
        if (input.masterKey !== masterKey) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid master key" });
        }

        const key = input.isAgent ? "agent_password_hash" : "admin_password_hash";
        const hash = await getSetting(key);
        if (!hash) throw new TRPCError({ code: "NOT_FOUND", message: "Account not configured" });

        if (input.isAgent) {
          const enabled = await getSetting("agent_enabled");
          if (enabled !== "true") throw new TRPCError({ code: "FORBIDDEN", message: "Agent disabled" });
        }

        const valid = await bcrypt.compare(input.password, hash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });

        const token = await new SignJWT({ type: input.isAgent ? "agent" : "admin" })
          .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("24h").sign(secret);

        const s = await db();
        await s.from("activity_logs").insert({
          actor_type: input.isAgent ? "agent" : "admin", action: "login", target_type: "system",
          details: { master_key_used: true },
        });

        return { token, type: input.isAgent ? "agent" as const : "admin" as const };
      }),

    me: publicProc.query(async ({ ctx }) => {
      const token = ctx.req.headers.get("x-auth-token");
      if (!token) return null;
      try {
        const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
        return { type: payload.type as "admin" | "agent" };
      } catch { return null; }
    }),

    logout: publicProc.mutation(() => ({ success: true })),
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
    visitTrend: authedProc.input(z.object({ days: z.number().default(7) })).query(({ input }) => {
      return Array.from({ length: input.days }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (input.days - 1 - i));
        return { date: d.toISOString().split("T")[0], count: Math.floor(Math.random() * 200) + 100 };
      });
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
        const { data, error } = await s.from("projects").insert(input).select().single();
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
    testConnection: authedProc.input(z.object({ provider: z.string() })).query(async ({ input }) => {
      const s = await db();
      const { data, error } = await s.from("oauth_configs").select("*").eq("provider", input.provider).single();
      if (error || !data) return { success: false, message: "Not found" };
      return { success: !!data.client_id, message: data.client_id ? "OK" : "Invalid" };
    }),
  }),

  agent: router({
    getStatus: authedProc.query(async () => {
      const enabled = (await getSetting("agent_enabled")) === "true";
      const permsStr = await getSetting("agent_permissions");
      const permissions = permsStr ? JSON.parse(permsStr) : {};
      const s = await db();
      const today = new Date().toISOString().split("T")[0];
      const { count } = await s.from("agent_access_logs").select("*", { count: "exact" }).gte("created_at", today);
      const { data: lastLog } = await s.from("agent_access_logs").select("created_at").order("created_at", { ascending: false }).limit(1).single();
      return { enabled, lastAccess: lastLog?.created_at ?? null, todayCalls: count ?? 0, permissions };
    }),
    updatePassword: authedProc.input(z.object({ currentPassword: z.string(), newPassword: z.string().min(6) }))
      .mutation(async ({ input }) => {
        const hash = await getSetting("agent_password_hash");
        if (!hash) throw new Error("Agent not configured");
        if (!await bcrypt.compare(input.currentPassword, hash)) throw new Error("Wrong password");
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await setSetting("agent_password_hash", newHash);
        return { success: true };
      }),
    updatePermissions: authedProc.input(z.object({ permissions: z.record(z.string(), z.boolean()) }))
      .mutation(async ({ input }) => {
        await setSetting("agent_permissions", JSON.stringify(input.permissions));
        return { success: true };
      }),
    toggleEnabled: authedProc.input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        await setSetting("agent_enabled", String(input.enabled));
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

  settings: router({
    getMasterKey: authedProc.query(async () => {
      const key = await getSetting("admin_master_key");
      return { key: key || env.adminMasterKey, isCustom: !!key };
    }),
    updateMasterKey: authedProc.input(z.object({ newKey: z.string().min(10) })).mutation(async ({ input }) => {
      await setSetting("admin_master_key", input.newKey);
      return { success: true };
    }),
    updateAdminPassword: authedProc.input(z.object({ currentPassword: z.string(), newPassword: z.string().min(6) })).mutation(async ({ input }) => {
      const hash = await getSetting("admin_password_hash");
      if (!hash) throw new Error("Admin not configured");
      if (!await bcrypt.compare(input.currentPassword, hash)) throw new Error("Wrong password");
      const newHash = await bcrypt.hash(input.newPassword, 12);
      await setSetting("admin_password_hash", newHash);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
export { appRouter };

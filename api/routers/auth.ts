import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { createRouter, publicQuery } from "../middleware";
import { env } from "../lib/env";
import { db } from "../lib/supabase";
import { TRPCError } from "@trpc/server";

const secret = new TextEncoder().encode(env.appSecret);

async function getSetting(key: string): Promise<string | null> {
  const s = await db();
  const { data, error } = await s.from("admin_settings").select("value").eq("key", key).single();
  if (error || !data) return null;
  return data.value;
}

async function getAgentPermissions(): Promise<Record<string, boolean>> {
  const perms = await getSetting("agent_permissions");
  if (!perms) return {};
  try {
    return JSON.parse(perms) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export const authRouter = createRouter({
  login: publicQuery
    .input(
      z.object({
        password: z.string().min(1),
        isAgent: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const key = input.isAgent ? "agent_password_hash" : "admin_password_hash";
      const hash = await getSetting(key);

      if (!hash) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not configured" });
      }

      if (input.isAgent) {
        const enabled = await getSetting("agent_enabled");
        if (enabled !== "true") {
          throw new TRPCError({ code: "FORBIDDEN", message: "AI Agent access is disabled" });
        }
      }

      const valid = await bcrypt.compare(input.password, hash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
      }

      const permissions = input.isAgent ? await getAgentPermissions() : undefined;

      const token = await new SignJWT({
        type: input.isAgent ? "agent" : "admin",
        ...(permissions ? { permissions } : {}),
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(secret);

      // Log activity
      const s = await db();
      await s.from("activity_logs").insert({
        actor_type: input.isAgent ? "agent" : "admin",
        action: "login",
        target_type: "system",
        details: { ip: "unknown" },
      });

      return { token, type: input.isAgent ? "agent" as const : "admin" as const, permissions };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    const adminToken = ctx.req.headers.get("x-admin-token");
    const agentToken = ctx.req.headers.get("x-agent-token");
    const token = adminToken || agentToken;

    if (!token) return null;

    try {
      const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
      return {
        type: payload.type as "admin" | "agent",
        permissions: (payload.permissions as Record<string, boolean>) || undefined,
      };
    } catch {
      return null;
    }
  }),

  logout: publicQuery.mutation(() => {
    return { success: true };
  }),
});

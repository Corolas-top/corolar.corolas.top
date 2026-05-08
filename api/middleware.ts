import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

// Admin-only: requires valid admin token
export const adminQuery = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.auth || ctx.auth.type !== "admin") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin access required" });
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

// Agent-only: requires valid agent token + enabled agent
export const agentQuery = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.auth || ctx.auth.type !== "agent") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Agent access required" });
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

// Any authenticated: admin or agent
export const anyAuthQuery = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

// Agent with specific permission check
export function agentPermissionQuery(permission: string) {
  return t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.auth || ctx.auth.type !== "agent") {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Agent access required" });
    }
    if (!ctx.auth.permissions?.[permission]) {
      throw new TRPCError({ code: "FORBIDDEN", message: `Permission '${permission}' required` });
    }
    return next({ ctx: { ...ctx, auth: ctx.auth } });
  });
}

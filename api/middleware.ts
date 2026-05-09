import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Ctx } from "./context";

const t = initTRPC.context<Ctx>().create({ transformer: superjson });
export const router = t.router;
export const publicProc = t.procedure;
export const authedProc = t.procedure.use(({ ctx, next }) => {
  if (!ctx.auth) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});
export const adminProc = t.procedure.use(({ ctx, next }) => {
  if (ctx.auth?.type !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

const secret = new TextEncoder().encode(env.appSecret);

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  auth?: { type: "admin" | "agent"; permissions?: Record<string, boolean> };
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const auth = await resolveAuth(opts.req);
  return { req: opts.req, resHeaders: opts.resHeaders, auth };
}

async function resolveAuth(
  req: Request,
): Promise<TrpcContext["auth"]> {
  const adminToken = req.headers.get("x-admin-token");
  const agentToken = req.headers.get("x-agent-token");
  const token = adminToken || agentToken;

  if (!token) return undefined;

  try {
    const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
    const type = payload.type as "admin" | "agent";
    const permissions = (payload.permissions as Record<string, boolean>) || undefined;
    return { type, permissions };
  } catch {
    return undefined;
  }
}

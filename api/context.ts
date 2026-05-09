import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

const secret = new TextEncoder().encode(env.appSecret);

export type Ctx = {
  req: Request;
  resHeaders: Headers;
  auth?: { type: "admin" | "agent" };
};

export async function createContext(opts: FetchCreateContextFnOptions): Promise<Ctx> {
  const token = opts.req.headers.get("x-auth-token");
  let auth: Ctx["auth"];
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
      auth = { type: payload.type as "admin" | "agent" };
    } catch { /* ignore */ }
  }
  return { req: opts.req, resHeaders: opts.resHeaders, auth };
}

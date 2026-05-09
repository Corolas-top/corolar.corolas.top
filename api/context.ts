import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { verifyToken } from "./lib/supabase";

export type Ctx = {
  req: Request;
  resHeaders: Headers;
  auth?: { userId: string; email?: string };
};

export async function createContext(opts: FetchCreateContextFnOptions): Promise<Ctx> {
  const token = opts.req.headers.get("x-auth-token");
  if (token) {
    const user = await verifyToken(token);
    if (user) return { req: opts.req, resHeaders: opts.resHeaders, auth: { userId: user.id, email: user.email } };
  }
  return { req: opts.req, resHeaders: opts.resHeaders };
}

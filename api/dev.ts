import { createServer } from "vite";
import { createServer as createNodeServer } from "node:http";
import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { db } from "./lib/supabase";

const app = new Hono();
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({ endpoint: "/api/trpc", req: c.req.raw, router: appRouter, createContext });
});

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "spa",
});

db().catch(() => {}); // warm up

const server = createNodeServer(async (req, res) => {
  if (req.url?.startsWith("/api/")) {
    const response = await app.fetch(req as unknown as Request);
    const body = await response.text();
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(body);
    return;
  }
  vite.middlewares(req, res);
});

server.listen(3000, () => console.log("Dev server: http://localhost:3000"));

import { createServer } from "node:http";
import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";

const app = new Hono();
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({ endpoint: "/api/trpc", req: c.req.raw, router: appRouter, createContext });
});

const server = createServer(async (req, res) => {
  if (req.url?.startsWith("/api/")) {
    const response = await app.fetch(req as unknown as Request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
    return;
  }
  const { createServer: createVite } = await import("vite");
  const vite = await createVite({ server: { middlewareMode: true }, appType: "spa" });
  vite.middlewares(req, res);
});

server.listen(3000, () => console.log("Dev server: http://localhost:3000"));

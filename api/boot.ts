/**
 * Local Production Server Entry
 * Used by `npm start` (node dist/boot.js) or local Docker.
 * Vercel uses api/index.ts instead — do not add server startup here.
 */
import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { serveStaticFiles } from "./lib/vite";
import { serve } from "@hono/node-server";

const app = new Hono();

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({ endpoint: "/api/trpc", req: c.req.raw, router: appRouter, createContext });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

serveStaticFiles(app);
const port = parseInt(process.env.PORT || "3000");
serve({ fetch: app.fetch, port }, () => console.log(`Server running on port ${port}`));

export default app;

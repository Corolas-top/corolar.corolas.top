/**
 * Vercel Serverless Function Entry Point
 * Pure, no top-level await, no conditional server startup.
 * Only exports the Hono app for Vercel to handle.
 */
import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";

const app = new Hono();

// Global error logger
app.onError((err, c) => {
  const errMsg = err instanceof Error ? err.message : String(err);
  console.error("[API Error]", errMsg);
  return c.json({ error: "Internal Server Error", message: errMsg }, 500);
});

// Health check
app.get("/api/health", (c) => c.json({ ok: true, time: new Date().toISOString() }));

// tRPC handler
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// 404 fallback
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

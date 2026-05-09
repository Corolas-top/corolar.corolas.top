import type { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";

export function serveStaticFiles(app: Hono) {
  app.use("/assets/*", serveStatic({ root: "./dist" }));
  app.use("/*", serveStatic({ root: "./dist", path: "index.html" }));
}

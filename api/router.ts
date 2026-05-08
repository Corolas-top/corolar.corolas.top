import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./routers/auth";
import { projectsRouter } from "./routers/projects";
import { usersRouter } from "./routers/users";
import { oauthRouter } from "./routers/oauth";
import { agentRouter } from "./routers/agent";
import { canvasRouter } from "./routers/canvas";
import { notesRouter } from "./routers/notes";
import { activityRouter } from "./routers/activity";
import { dashboardRouter } from "./routers/dashboard";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  projects: projectsRouter,
  users: usersRouter,
  oauth: oauthRouter,
  agent: agentRouter,
  canvas: canvasRouter,
  notes: notesRouter,
  activity: activityRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;

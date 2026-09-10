import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler } from "./lib/errors.js";
import { authRouter } from "./modules/auth/router.js";
import { workspacesRouter } from "./modules/workspaces/router.js";
import { projectsRouter } from "./modules/projects/router.js";
import { tasksRouter } from "./modules/tasks/router.js";
import { labelsRouter } from "./modules/labels/router.js";
import { commentsRouter } from "./modules/comments/router.js";
import { dashboardRouter } from "./modules/dashboard/router.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  // Health + readiness
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), env: env.NODE_ENV });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/workspaces", workspacesRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/tasks", tasksRouter);
  // labels nested under workspaces
  app.use("/api/workspaces/:workspaceId/labels", labelsRouter);
  // comments nested under tasks
  app.use("/api/tasks/:taskId/comments", commentsRouter);
  app.use("/api/dashboard", dashboardRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "API route not found" } });
  });

  app.use(errorHandler);
  return app;
}

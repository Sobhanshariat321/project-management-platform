import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/auth.js";
import { AppError } from "../../lib/errors.js";
import { requireWorkspaceMember } from "../../middleware/authz.js";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get("/", async (req, res) => {
  const q = req.query as Record<string, string>;
  const workspaceId = q.workspaceId as string | undefined;
  const projectId = q.projectId as string | undefined;
  const userId = req.user!.id;

  let workspaceIds: string[] = [];
  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
    if (!project) throw new AppError("NOT_FOUND", 404, "Project not found");
    await requireWorkspaceMember(project.workspaceId, userId);
    workspaceIds = [project.workspaceId];
  } else if (workspaceId) {
    await requireWorkspaceMember(workspaceId, userId);
    workspaceIds = [workspaceId];
  } else {
    const memberships = await prisma.workspaceMember.findMany({ where: { userId }, select: { workspaceId: true } });
    workspaceIds = memberships.map((m) => m.workspaceId);
  }

  if (workspaceIds.length === 0) {
    res.json({ totalTasks: 0, byStatus: {}, byPriority: {}, overdue: 0, recentActivity: [] });
    return;
  }

  const projectWhere: Record<string, unknown> = projectId ? { id: projectId } : { workspaceId: { in: workspaceIds } };
  const projects = await prisma.project.findMany({ where: projectWhere, select: { id: true } });
  const projectIds = projects.map((p) => p.id);

  const [totalTasks, byStatusRaw, byPriorityRaw, overdue, recentActivity] = await Promise.all([
    prisma.task.count({ where: { projectId: { in: projectIds } } }),
    prisma.task.groupBy({ by: ["status"], where: { projectId: { in: projectIds } }, _count: true }),
    prisma.task.groupBy({ by: ["priority"], where: { projectId: { in: projectIds } }, _count: true }),
    prisma.task.count({ where: { projectId: { in: projectIds }, dueDate: { lt: new Date() }, status: { not: "done" } } }),
    prisma.activityLog.findMany({
      where: { task: { projectId: { in: projectIds } } },
      include: { actor: { select: { id: true, displayName: true } }, task: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const r of byStatusRaw) byStatus[r.status] = r._count;
  const byPriority: Record<string, number> = {};
  for (const r of byPriorityRaw) byPriority[r.priority] = r._count;

  res.json({ totalTasks, byStatus, byPriority, overdue, recentActivity, projectIds });
});

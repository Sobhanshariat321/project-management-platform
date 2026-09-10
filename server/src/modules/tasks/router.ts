import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { authenticate } from "../../middleware/auth.js";
import { validate, validateQuery } from "../../middleware/validate.js";
import { taskCreateSchema, taskUpdateSchema, taskQuerySchema } from "@repo/shared";
import { requireWorkspaceMember, requireProjectAccess, requireTaskAccess } from "../../middleware/authz.js";

export const tasksRouter = Router();
tasksRouter.use(authenticate);

async function validateAssignees(projectId: string, assigneeIds?: string[]) {
  if (!assigneeIds?.length) return;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
  if (!project) throw new AppError("NOT_FOUND", 404, "Project not found");
  for (const uid of assigneeIds) {
    const m = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: uid } },
    });
    if (!m) throw new AppError("VALIDATION_ERROR", 400, `Assignee ${uid} not in workspace`);
  }
}
async function validateLabels(projectId: string, labelIds?: string[]) {
  if (!labelIds?.length) return;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
  if (!project) throw new AppError("NOT_FOUND", 404, "Project not found");
  for (const lid of labelIds) {
    const l = await prisma.label.findUnique({ where: { id: lid } });
    if (!l || l.workspaceId !== project.workspaceId) throw new AppError("VALIDATION_ERROR", 400, `Label ${lid} not in workspace`);
  }
}

tasksRouter.get("/", validateQuery(taskQuerySchema), async (req, res) => {
  const q = (req as unknown as { parsedQuery: import("@repo/shared").TaskQuery }).parsedQuery;
  const userId = req.user!.id;
  const where: Record<string, unknown> = {};

  if (q.projectId) {
    const project = await prisma.project.findUnique({ where: { id: q.projectId }, select: { workspaceId: true } });
    if (!project) throw new AppError("NOT_FOUND", 404, "Project not found");
    await requireWorkspaceMember(project.workspaceId, userId);
    (where as Record<string, unknown>).projectId = q.projectId;
  } else if (q.workspaceId) {
    await requireWorkspaceMember(q.workspaceId, userId);
    (where as Record<string, unknown>).project = { workspaceId: q.workspaceId };
  } else {
    const memberships = await prisma.workspaceMember.findMany({ where: { userId }, select: { workspaceId: true } });
    const wsIds = memberships.map((m) => m.workspaceId);
    if (wsIds.length === 0) {
      res.json({ data: [], total: 0, page: q.page, totalPages: 0 });
      return;
    }
    (where as Record<string, unknown>).project = { workspaceId: { in: wsIds } };
  }

  if (q.status) (where as Record<string, unknown>).status = q.status;
  if (q.priority) (where as Record<string, unknown>).priority = q.priority;
  if (q.assigneeId) (where as Record<string, unknown>).assignees = { some: { userId: q.assigneeId } };
  if (q.labelId) (where as Record<string, unknown>).labels = { some: { labelId: q.labelId } };
  if (q.dueBefore || q.dueAfter) {
    (where as Record<string, unknown>).dueDate = {
      ...(q.dueBefore ? { lte: q.dueBefore } : {}),
      ...(q.dueAfter ? { gte: q.dueAfter } : {}),
    };
  }
  if (q.search) {
    (where as Record<string, unknown>).OR = [
      { title: { contains: q.search, mode: "insensitive" } },
      { description: { contains: q.search, mode: "insensitive" } },
    ];
  }

  const sortMap: Record<string, string> = {
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    dueDate: "dueDate",
    priority: "priority",
    position: "position",
  };
  const orderBy: Record<string, string> = {};
  orderBy[sortMap[q.sortBy] ?? "createdAt"] = q.sortOrder;

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignees: { include: { user: { select: { id: true, email: true, displayName: true } } } },
        labels: { include: { label: true } },
        _count: { select: { comments: true } },
      },
      orderBy,
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.task.count({ where }),
  ]);

  const mapped = data.map((t) => ({
    ...t,
    assignees: t.assignees.map((a) => a.user),
    labels: t.labels.map((l) => l.label),
  }));

  res.json({ data: mapped, total, page: q.page, totalPages: Math.ceil(total / q.limit) });
});

tasksRouter.post("/", validate(taskCreateSchema), async (req, res) => {
  const body = req.body as {
    projectId: string;
    title: string;
    description?: string;
    status: "backlog" | "todo" | "in_progress" | "in_review" | "done";
    priority: "low" | "medium" | "high" | "urgent";
    dueDate?: Date | null;
    assigneeIds?: string[];
    labelIds?: string[];
  };
  await requireProjectAccess(body.projectId, req.user!.id);
  const assigneeIds = [...new Set(body.assigneeIds ?? [])];
  const labelIds = [...new Set(body.labelIds ?? [])];
  await validateAssignees(body.projectId, assigneeIds);
  await validateLabels(body.projectId, labelIds);

  const maxPos = await prisma.task.aggregate({ where: { projectId: body.projectId, status: body.status }, _max: { position: true } });
  const position = (maxPos._max.position ?? 0) + 1000;

  const task = await prisma.task.create({
    data: {
      projectId: body.projectId,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      dueDate: body.dueDate ?? undefined,
      position,
      creatorId: req.user!.id,
    },
  });

  if (assigneeIds.length) {
    await prisma.taskAssignee.createMany({
      data: assigneeIds.map((uid) => ({ taskId: task.id, userId: uid })),
    });
  }
  if (labelIds.length) {
    await prisma.taskLabel.createMany({ data: labelIds.map((lid) => ({ taskId: task.id, labelId: lid })) });
  }

  await prisma.activityLog.create({
    data: { taskId: task.id, actorId: req.user!.id, action: "task_created", to: { title: body.title, status: body.status } as unknown as object },
  });

  const full = await prisma.task.findUnique({
    where: { id: task.id },
    include: {
      assignees: { include: { user: { select: { id: true, email: true, displayName: true } } } },
      labels: { include: { label: true } },
    },
  });

  res.status(201).json({
    task: {
      ...full!,
      assignees: full!.assignees.map((a) => a.user),
      labels: full!.labels.map((l) => l.label),
    },
  });
});

tasksRouter.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  await requireTaskAccess(id, req.user!.id);
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignees: { include: { user: { select: { id: true, email: true, displayName: true } } } },
      labels: { include: { label: true } },
      comments: { include: { author: { select: { id: true, displayName: true, email: true } } }, orderBy: { createdAt: "asc" } },
      project: { select: { workspaceId: true } },
    },
  });
  if (!task) throw new AppError("NOT_FOUND", 404, "Task not found");
  res.json({
    task: {
      ...task,
      assignees: task.assignees.map((a) => a.user),
      labels: task.labels.map((l) => l.label),
    },
  });
});

tasksRouter.patch("/:id", validate(taskUpdateSchema), async (req, res) => {
  const id = req.params.id as string;
  await requireTaskAccess(id, req.user!.id);
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new AppError("NOT_FOUND", 404, "Task not found");
  const body = req.body as {
    title?: string;
    description?: string | null;
    status?: string;
    priority?: string;
    dueDate?: Date | null;
    position?: number;
    assigneeIds?: string[];
    labelIds?: string[];
  };

  if (body.assigneeIds) await validateAssignees(existing.projectId, [...new Set(body.assigneeIds)]);
  if (body.labelIds) await validateLabels(existing.projectId, [...new Set(body.labelIds)]);

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate;
  if (body.position !== undefined) updateData.position = body.position;

  await prisma.task.update({ where: { id }, data: updateData });

  if (body.assigneeIds !== undefined) {
    await prisma.taskAssignee.deleteMany({ where: { taskId: id } });
    const dedupedAssignees = [...new Set(body.assigneeIds)];
    if (dedupedAssignees.length) {
      await prisma.taskAssignee.createMany({ data: dedupedAssignees.map((uid) => ({ taskId: id, userId: uid })) });
    }
  }
  if (body.labelIds !== undefined) {
    await prisma.taskLabel.deleteMany({ where: { taskId: id } });
    const dedupedLabels = [...new Set(body.labelIds)];
    if (dedupedLabels.length) {
      await prisma.taskLabel.createMany({ data: dedupedLabels.map((lid) => ({ taskId: id, labelId: lid })) });
    }
  }

  const action = body.status && body.status !== existing.status ? "task_moved" : "task_updated";
  await prisma.activityLog.create({
    data: {
      taskId: id,
      actorId: req.user!.id,
      action: action as "task_moved" | "task_updated",
      from: { status: existing.status, title: existing.title } as unknown as object,
      to: { status: body.status ?? existing.status, title: body.title ?? existing.title } as unknown as object,
    },
  });

  const full = await prisma.task.findUnique({
    where: { id },
    include: {
      assignees: { include: { user: { select: { id: true, email: true, displayName: true } } } },
      labels: { include: { label: true } },
    },
  });
  res.json({ task: { ...full!, assignees: full!.assignees.map((a) => a.user), labels: full!.labels.map((l) => l.label) } });
});

tasksRouter.delete("/:id", async (req, res) => {
  const id = req.params.id as string;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new AppError("NOT_FOUND", 404, "Task not found");
  await requireTaskAccess(id, req.user!.id);
  await prisma.activityLog.create({
    data: { taskId: id, actorId: req.user!.id, action: "task_deleted", from: { title: task.title } as unknown as object },
  }).catch(() => {});
  await prisma.task.delete({ where: { id } });
  res.status(204).send();
});

tasksRouter.get("/:id/activity", async (req, res) => {
  const id = req.params.id as string;
  await requireTaskAccess(id, req.user!.id);
  const logs = await prisma.activityLog.findMany({
    where: { taskId: id },
    include: { actor: { select: { id: true, displayName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ data: logs });
});

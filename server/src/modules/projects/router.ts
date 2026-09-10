import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { projectCreateSchema, projectUpdateSchema } from "@repo/shared";
import { requireWorkspaceMember } from "../../middleware/authz.js";

export const projectsRouter = Router();
projectsRouter.use(authenticate);

const listQuery = z.object({
  workspaceId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

projectsRouter.get("/", async (req, res) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) throw parsed.error;
  const { workspaceId, page, limit } = parsed.data;
  const userId = req.user!.id;

  let where: Record<string, unknown> = {};
  if (workspaceId) {
    await requireWorkspaceMember(workspaceId, userId);
    where = { workspaceId };
  } else {
    const memberships = await prisma.workspaceMember.findMany({ where: { userId }, select: { workspaceId: true } });
    const ids = memberships.map((m) => m.workspaceId);
    where = { workspaceId: { in: ids.length ? ids : ["00000000-0000-0000-0000-000000000000"] } };
  }
  const [data, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tasks: true } } },
    }),
    prisma.project.count({ where }),
  ]);
  res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
});

projectsRouter.post("/", validate(projectCreateSchema), async (req, res) => {
  const { workspaceId, name, key, description } = req.body as {
    workspaceId: string;
    name: string;
    key?: string;
    description?: string;
  };
  await requireWorkspaceMember(workspaceId, req.user!.id);
  if (key) {
    const exists = await prisma.project.findUnique({
      where: { workspaceId_key: { workspaceId, key } },
    });
    if (exists) throw new AppError("CONFLICT", 409, "Project key already exists in workspace");
  }
  const project = await prisma.project.create({
    data: { workspaceId, name, key, description, creatorId: req.user!.id },
  });
  await prisma.projectMember.create({ data: { projectId: project.id, userId: req.user!.id } });
  res.status(201).json({ project });
});

projectsRouter.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const project = await prisma.project.findUnique({ where: { id }, include: { workspace: true } });
  if (!project) throw new AppError("NOT_FOUND", 404, "Project not found");
  await requireWorkspaceMember(project.workspaceId, req.user!.id);
  res.json({ project });
});

projectsRouter.patch("/:id", validate(projectUpdateSchema), async (req, res) => {
  const id = req.params.id as string;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw new AppError("NOT_FOUND", 404, "Project not found");
  await requireWorkspaceMember(existing.workspaceId, req.user!.id);
  const data = req.body as { name?: string; description?: string; status?: "active" | "archived" };
  const project = await prisma.project.update({ where: { id }, data });
  res.json({ project });
});

projectsRouter.delete("/:id", async (req, res) => {
  const id = req.params.id as string;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw new AppError("NOT_FOUND", 404, "Project not found");
  const membership = await requireWorkspaceMember(existing.workspaceId, req.user!.id);
  if (membership.role === "member" && existing.creatorId !== req.user!.id) {
    throw new AppError("FORBIDDEN", 403, "Only workspace owner/admin or project creator can delete");
  }
  await prisma.project.delete({ where: { id } });
  res.status(204).send();
});

projectsRouter.get("/:id/members", async (req, res) => {
  const id = req.params.id as string;
  const project = await prisma.project.findUnique({ where: { id }, select: { workspaceId: true } });
  if (!project) throw new AppError("NOT_FOUND", 404, "Project not found");
  await requireWorkspaceMember(project.workspaceId, req.user!.id);
  const members = await prisma.projectMember.findMany({
    where: { projectId: id },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  });
  res.json({ data: members });
});

projectsRouter.post("/:id/members", async (req, res) => {
  const id = req.params.id as string;
  const project = await prisma.project.findUnique({ where: { id }, select: { workspaceId: true } });
  if (!project) throw new AppError("NOT_FOUND", 404, "Project not found");
  await requireWorkspaceMember(project.workspaceId, req.user!.id);
  const { userId } = req.body as { userId: string };
  if (!userId) throw new AppError("VALIDATION_ERROR", 400, "userId required");
  await requireWorkspaceMember(project.workspaceId, userId);
  const exists = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: id, userId } } });
  if (exists) throw new AppError("CONFLICT", 409, "Already a project member");
  const member = await prisma.projectMember.create({ data: { projectId: id, userId } });
  res.status(201).json({ member });
});

projectsRouter.delete("/:id/members/:userId", async (req, res) => {
  const id = req.params.id as string;
  const userId = req.params.userId as string;
  const project = await prisma.project.findUnique({ where: { id }, select: { workspaceId: true } });
  if (!project) throw new AppError("NOT_FOUND", 404, "Project not found");
  await requireWorkspaceMember(project.workspaceId, req.user!.id);
  await prisma.projectMember.delete({ where: { projectId_userId: { projectId: id, userId } } }).catch(() => {
    throw new AppError("NOT_FOUND", 404, "Member not found");
  });
  res.status(204).send();
});

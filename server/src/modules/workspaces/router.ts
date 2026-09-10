import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { workspaceCreateSchema, workspaceUpdateSchema, workspaceMemberAddSchema } from "@repo/shared";
import { requireWorkspaceMember, requireWorkspaceRole } from "../../middleware/authz.js";

export const workspacesRouter = Router();
workspacesRouter.use(authenticate);

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

workspacesRouter.get("/", async (req, res) => {
  const parsed = paginationQuery.safeParse(req.query);
  if (!parsed.success) throw parsed.error;
  const { page, limit } = parsed.data;
  const userId = req.user!.id;
  const [memberships, total] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { workspace: { createdAt: "desc" } },
    }),
    prisma.workspaceMember.count({ where: { userId } }),
  ]);
  const data = memberships.map((m) => ({ ...m.workspace, role: m.role }));
  res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
});

workspacesRouter.post("/", validate(workspaceCreateSchema), async (req, res) => {
  const { name, handle, description } = req.body as { name: string; handle?: string; description?: string };
  const userId = req.user!.id;
  if (handle) {
    const exists = await prisma.workspace.findUnique({ where: { handle } });
    if (exists) throw new AppError("CONFLICT", 409, "Handle already taken");
  }
  const workspace = await prisma.workspace.create({
    data: { name, handle, description, ownerId: userId },
  });
  await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId, role: "owner" } });
  res.status(201).json({ workspace });
});

workspacesRouter.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  await requireWorkspaceMember(id, req.user!.id);
  const workspace = await prisma.workspace.findUnique({ where: { id } });
  if (!workspace) throw new AppError("NOT_FOUND", 404, "Workspace not found");
  res.json({ workspace });
});

workspacesRouter.patch("/:id", validate(workspaceUpdateSchema), async (req, res) => {
  const id = req.params.id as string;
  await requireWorkspaceRole(id, req.user!.id, ["owner", "admin"]);
  const data = req.body as { name?: string; description?: string };
  const workspace = await prisma.workspace.update({ where: { id }, data });
  res.json({ workspace });
});

workspacesRouter.delete("/:id", async (req, res) => {
  const id = req.params.id as string;
  const member = await requireWorkspaceMember(id, req.user!.id);
  if (member.role !== "owner") throw new AppError("FORBIDDEN", 403, "Only owner can delete workspace");
  await prisma.workspace.delete({ where: { id } });
  res.status(204).send();
});

workspacesRouter.get("/:id/members", async (req, res) => {
  const id = req.params.id as string;
  await requireWorkspaceMember(id, req.user!.id);
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: id },
    include: { user: { select: { id: true, email: true, displayName: true } } },
    orderBy: { joinedAt: "asc" },
  });
  res.json({ data: members });
});

workspacesRouter.post("/:id/members", validate(workspaceMemberAddSchema), async (req, res) => {
  const id = req.params.id as string;
  await requireWorkspaceRole(id, req.user!.id, ["owner", "admin"]);
  const { email, role } = req.body as { email: string; role: "admin" | "member" };
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, displayName: true } });
  if (!user) throw new AppError("NOT_FOUND", 404, "User not found");
  const exists = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: id, userId: user.id } },
  });
  if (exists) throw new AppError("CONFLICT", 409, "Already a member");
  const member = await prisma.workspaceMember.create({ data: { workspaceId: id, userId: user.id, role } });
  res.status(201).json({ member: { ...member, user } });
});

workspacesRouter.delete("/:id/members/:userId", async (req, res) => {
  const id = req.params.id as string;
  const userId = req.params.userId as string;
  const requester = await requireWorkspaceMember(id, req.user!.id);
  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: id, userId } },
  });
  if (!target) throw new AppError("NOT_FOUND", 404, "Member not found");
  const isSelf = userId === req.user!.id;
  if (!isSelf && requester.role === "member") throw new AppError("FORBIDDEN", 403, "Insufficient permission");
  if (target.role === "owner") throw new AppError("FORBIDDEN", 403, "Cannot remove owner");
  await prisma.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId: id, userId } } });
  const projects = await prisma.project.findMany({ where: { workspaceId: id }, select: { id: true } });
  const projectIds = projects.map((p) => p.id);
  if (projectIds.length) {
    await prisma.projectMember.deleteMany({ where: { projectId: { in: projectIds }, userId } });
    await prisma.taskAssignee.deleteMany({ where: { userId, task: { projectId: { in: projectIds } } } });
  }
  res.status(204).send();
});

workspacesRouter.patch("/:id/members/:userId", async (req, res) => {
  const id = req.params.id as string;
  const userId = req.params.userId as string;
  await requireWorkspaceRole(id, req.user!.id, ["owner", "admin"]);
  const schema = z.object({ role: z.enum(["admin", "member"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw parsed.error;
  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: id, userId } },
  });
  if (!target) throw new AppError("NOT_FOUND", 404, "Member not found");
  if (target.role === "owner") throw new AppError("FORBIDDEN", 403, "Cannot change owner role");
  const updated = await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId: id, userId } },
    data: { role: parsed.data.role },
  });
  res.json({ member: updated });
});

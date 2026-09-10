import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

export async function requireWorkspaceMember(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new AppError("FORBIDDEN", 403, "Not a workspace member");
  return member;
}

export async function requireWorkspaceRole(
  workspaceId: string,
  userId: string,
  allowed: Array<"owner" | "admin" | "member">,
) {
  const member = await requireWorkspaceMember(workspaceId, userId);
  if (!allowed.includes(member.role as "owner" | "admin" | "member")) {
    throw new AppError("FORBIDDEN", 403, "Insufficient workspace permission");
  }
  return member;
}

export async function requireProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!project) throw new AppError("NOT_FOUND", 404, "Project not found");
  await requireWorkspaceMember(project.workspaceId, userId);
  return project;
}

export async function requireTaskAccess(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true, project: { select: { workspaceId: true } } },
  });
  if (!task) throw new AppError("NOT_FOUND", 404, "Task not found");
  await requireWorkspaceMember(task.project.workspaceId, userId);
  return task;
}

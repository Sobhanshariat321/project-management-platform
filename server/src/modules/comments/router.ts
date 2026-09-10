import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { commentCreateSchema, commentUpdateSchema } from "@repo/shared";
import { requireTaskAccess } from "../../middleware/authz.js";

export const commentsRouter = Router({ mergeParams: true });
commentsRouter.use(authenticate);

commentsRouter.get("/", async (req, res) => {
  const taskId = (req.params as unknown as { taskId: string }).taskId;
  await requireTaskAccess(taskId, req.user!.id);
  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: { author: { select: { id: true, displayName: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json({ data: comments });
});

commentsRouter.post("/", validate(commentCreateSchema), async (req, res) => {
  const taskId = (req.params as unknown as { taskId: string }).taskId;
  await requireTaskAccess(taskId, req.user!.id);
  const { body } = req.body as { body: string };
  const comment = await prisma.comment.create({
    data: { taskId, authorId: req.user!.id, body },
    include: { author: { select: { id: true, displayName: true, email: true } } },
  });
  await prisma.activityLog.create({ data: { taskId, actorId: req.user!.id, action: "comment_added", to: { commentId: comment.id } as unknown as object } });
  res.status(201).json({ comment });
});

commentsRouter.patch("/:commentId", validate(commentUpdateSchema), async (req, res) => {
  const taskId = (req.params as unknown as { taskId: string }).taskId;
  const commentId = (req.params as unknown as { commentId: string }).commentId;
  await requireTaskAccess(taskId, req.user!.id);
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.taskId !== taskId) throw new AppError("NOT_FOUND", 404, "Comment not found");
  if (comment.authorId !== req.user!.id) throw new AppError("FORBIDDEN", 403, "Only author can edit");
  const { body } = req.body as { body: string };
  const updated = await prisma.comment.update({ where: { id: commentId }, data: { body }, include: { author: { select: { id: true, displayName: true, email: true } } } });
  await prisma.activityLog.create({ data: { taskId, actorId: req.user!.id, action: "comment_updated", to: { commentId } as unknown as object } });
  res.json({ comment: updated });
});

commentsRouter.delete("/:commentId", async (req, res) => {
  const taskId = (req.params as unknown as { taskId: string }).taskId;
  const commentId = (req.params as unknown as { commentId: string }).commentId;
  await requireTaskAccess(taskId, req.user!.id);
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.taskId !== taskId) throw new AppError("NOT_FOUND", 404, "Comment not found");
  if (comment.authorId !== req.user!.id) throw new AppError("FORBIDDEN", 403, "Only author can delete");
  await prisma.comment.delete({ where: { id: commentId } });
  await prisma.activityLog.create({ data: { taskId, actorId: req.user!.id, action: "comment_deleted", from: { commentId } as unknown as object } }).catch(() => {});
  res.status(204).send();
});

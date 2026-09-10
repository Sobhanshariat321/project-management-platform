import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { labelCreateSchema, labelUpdateSchema } from "@repo/shared";
import { requireWorkspaceMember, requireWorkspaceRole } from "../../middleware/authz.js";

export const labelsRouter = Router({ mergeParams: true });
labelsRouter.use(authenticate);

labelsRouter.get("/", async (req, res) => {
  const workspaceId = (req.params as unknown as { workspaceId: string }).workspaceId;
  await requireWorkspaceMember(workspaceId, req.user!.id);
  const labels = await prisma.label.findMany({ where: { workspaceId }, orderBy: { name: "asc" } });
  res.json({ data: labels });
});

labelsRouter.post("/", validate(labelCreateSchema), async (req, res) => {
  const workspaceId = (req.params as unknown as { workspaceId: string }).workspaceId;
  await requireWorkspaceMember(workspaceId, req.user!.id);
  const { name, color } = req.body as { name: string; color: string };
  const exists = await prisma.label.findUnique({ where: { workspaceId_name: { workspaceId, name } } });
  if (exists) throw new AppError("CONFLICT", 409, "Label name already exists");
  const label = await prisma.label.create({ data: { workspaceId, name, color } });
  res.status(201).json({ label });
});

labelsRouter.patch("/:labelId", validate(labelUpdateSchema), async (req, res) => {
  const workspaceId = (req.params as unknown as { workspaceId: string }).workspaceId;
  const labelId = (req.params as unknown as { labelId: string }).labelId;
  await requireWorkspaceMember(workspaceId, req.user!.id);
  const label = await prisma.label.findUnique({ where: { id: labelId } });
  if (!label || label.workspaceId !== workspaceId) throw new AppError("NOT_FOUND", 404, "Label not found");
  const updated = await prisma.label.update({ where: { id: labelId }, data: req.body as Record<string, unknown> });
  res.json({ label: updated });
});

labelsRouter.delete("/:labelId", async (req, res) => {
  const workspaceId = (req.params as unknown as { workspaceId: string }).workspaceId;
  const labelId = (req.params as unknown as { labelId: string }).labelId;
  await requireWorkspaceRole(workspaceId, req.user!.id, ["owner", "admin"]);
  const label = await prisma.label.findUnique({ where: { id: labelId } });
  if (!label || label.workspaceId !== workspaceId) throw new AppError("NOT_FOUND", 404, "Label not found");
  await prisma.label.delete({ where: { id: labelId } });
  res.status(204).send();
});

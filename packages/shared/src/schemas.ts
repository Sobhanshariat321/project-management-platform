import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────────────
export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(255),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128)
      .regex(/[A-Za-z]/, "Must contain a letter")
      .regex(/[0-9]/, "Must contain a number")
      .refine((v) => !["password", "12345678"].includes(v.toLowerCase()), "Too weak"),
    displayName: z.string().trim().min(1).max(64),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1),
  })
  .strict();

// ── Workspace ─────────────────────────────────────────────────────
export const workspaceCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(64),
    handle: z
      .string()
      .trim()
      .min(2)
      .max(32)
      .regex(/^[a-z0-9-]+$/, "lowercase alphanumeric + hyphen only")
      .optional(),
    description: z.string().trim().max(500).optional(),
  })
  .strict();

export const workspaceUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(64).optional(),
    description: z.string().trim().max(500).optional(),
  })
  .strict();

export const workspaceMemberAddSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(["admin", "member"]),
  })
  .strict();

// ── Project ───────────────────────────────────────────────────────
export const projectCreateSchema = z
  .object({
    workspaceId: z.string().uuid(),
    name: z.string().trim().min(1).max(64),
    key: z
      .string()
      .trim()
      .min(2)
      .max(10)
      .regex(/^[A-Z0-9]+$/, "Uppercase alphanumeric only")
      .optional(),
    description: z.string().trim().max(1000).optional(),
  })
  .strict();

export const projectUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(64).optional(),
    description: z.string().trim().max(1000).optional(),
    status: z.enum(["active", "archived"]).optional(),
  })
  .strict();

// ── Task ──────────────────────────────────────────────────────────
export const taskStatusEnum = z.enum(["backlog", "todo", "in_progress", "in_review", "done"]);
export const taskPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const taskCreateSchema = z
  .object({
    projectId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional(),
    status: taskStatusEnum.default("todo"),
    priority: taskPriorityEnum.default("medium"),
    dueDate: z.coerce.date().optional().nullable(),
    assigneeIds: z.array(z.string().uuid()).max(10).optional(),
    labelIds: z.array(z.string().uuid()).max(10).optional(),
  })
  .strict();

export const taskUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
    dueDate: z.coerce.date().optional().nullable(),
    position: z.number().int().optional(),
    assigneeIds: z.array(z.string().uuid()).max(10).optional(),
    labelIds: z.array(z.string().uuid()).max(10).optional(),
  })
  .strict();

// ── Label ─────────────────────────────────────────────────────────
export const labelCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(32),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be #RRGGBB"),
  })
  .strict();

export const labelUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(32).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  })
  .strict();

// ── Comment ───────────────────────────────────────────────────────
export const commentCreateSchema = z
  .object({
    body: z.string().trim().min(1).max(5000),
  })
  .strict();

export const commentUpdateSchema = z
  .object({
    body: z.string().trim().min(1).max(5000),
  })
  .strict();

// ── Query / pagination helpers ────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const taskQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  assigneeId: z.string().uuid().optional(),
  labelId: z.string().uuid().optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "dueDate", "priority", "position"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;

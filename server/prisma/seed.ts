import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("[seed] starting idempotent seed…");

  const passwordHash = await bcrypt.hash("Password123", 10);

  // ── Users ───────────────────────────────────────────────────────
  const users = await Promise.all(
    [
      { email: "maya@example.com", displayName: "Maya Patel" },
      { email: "raj@example.com", displayName: "Raj Singh" },
      { email: "sam@example.com", displayName: "Sam Lee" },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { email: u.email, displayName: u.displayName, passwordHash },
      }),
    ),
  );
  const [maya, raj, sam] = users;
  if (!maya || !raj || !sam) throw new Error("seed users failed");

  // ── Workspace ───────────────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { handle: "demo-workspace" },
    update: {},
    create: {
      name: "Demo Workspace",
      handle: "demo-workspace",
      description: "Seed workspace for local dev",
      ownerId: maya.id,
    },
  });

  for (const [user, role] of [
    [maya, "owner"],
    [raj, "admin"],
    [sam, "member"],
  ] as const) {
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      update: { role },
      create: { workspaceId: workspace.id, userId: user.id, role },
    });
  }

  // ── Project ─────────────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { workspaceId_key: { workspaceId: workspace.id, key: "DEMO" } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: "Demo Project",
      key: "DEMO",
      description: "Seed project with sample Kanban tasks",
      creatorId: maya.id,
    },
  });

  for (const u of users) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: u.id } },
      update: {},
      create: { projectId: project.id, userId: u.id },
    });
  }

  // ── Labels ──────────────────────────────────────────────────────
  const labelDefs = [
    { name: "frontend", color: "#3b82f6" },
    { name: "backend", color: "#10b981" },
    { name: "design", color: "#f59e0b" },
    { name: "bug", color: "#ef4444" },
  ];
  const labels = await Promise.all(
    labelDefs.map((l) =>
      prisma.label.upsert({
        where: { workspaceId_name: { workspaceId: workspace.id, name: l.name } },
        update: {},
        create: { workspaceId: workspace.id, name: l.name, color: l.color },
      }),
    ),
  );

  // ── Tasks (12 across 5 statuses) ────────────────────────────────
  const taskDefs: Array<{
    title: string;
    status: "backlog" | "todo" | "in_progress" | "in_review" | "done";
    priority: "low" | "medium" | "high" | "urgent";
    position: number;
  }> = [
    { title: "Set up project repo & CI", status: "done", priority: "high", position: 1000 },
    { title: "Design Kanban board wireframes", status: "done", priority: "high", position: 2000 },
    { title: "Implement auth (register/login)", status: "in_review", priority: "urgent", position: 1000 },
    { title: "Build workspace CRUD", status: "in_review", priority: "high", position: 2000 },
    { title: "Task drag-and-drop (dnd-kit)", status: "in_progress", priority: "urgent", position: 1000 },
    { title: "Search & filter bar", status: "in_progress", priority: "medium", position: 2000 },
    { title: "Dashboard analytics queries", status: "todo", priority: "medium", position: 1000 },
    { title: "Comments & activity feed", status: "todo", priority: "medium", position: 2000 },
    { title: "Responsive polish (360/768/1024)", status: "todo", priority: "low", position: 3000 },
    { title: "Invite-by-email flow (v2)", status: "backlog", priority: "low", position: 1000 },
    { title: "Gantt view (v2 — out of scope)", status: "backlog", priority: "low", position: 2000 },
    { title: "Keyboard shortcuts for board", status: "backlog", priority: "medium", position: 3000 },
  ];

  for (const t of taskDefs) {
    const existing = await prisma.task.findFirst({
      where: { projectId: project.id, title: t.title },
    });
    if (existing) continue;
    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        title: t.title,
        description: `Seed task: ${t.title}`,
        status: t.status,
        priority: t.priority,
        position: t.position,
        creatorId: maya.id,
      },
    });
    // assignees / labels / activity for a few tasks
    if (t.status === "in_progress") {
      await prisma.taskAssignee.create({ data: { taskId: task.id, userId: raj.id } });
    }
    if (t.title.includes("auth")) {
      await prisma.taskLabel.create({ data: { taskId: task.id, labelId: labels[1]!.id } });
    }
    await prisma.activityLog.create({
      data: {
        taskId: task.id,
        actorId: maya.id,
        action: "task_created",
        to: { title: t.title, status: t.status } as unknown as object,
      },
    });
    await prisma.comment.create({
      data: { taskId: task.id, authorId: sam.id, body: `Seed comment on "${t.title}" — looks good!` },
    });
  }

  console.log("[seed] done:", {
    users: users.length,
    workspace: workspace.handle,
    project: project.key,
    labels: labels.length,
    tasks: taskDefs.length,
  });
}

main()
  .catch((e) => {
    console.error("[seed] failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

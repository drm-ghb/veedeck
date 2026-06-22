import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { pusherServer } from "@/lib/pusher";
import { checkTeamPermission } from "@/lib/permissions";

const taskInclude = {
  project: { select: { id: true, title: true } },
  assignee: { select: { id: true, name: true, email: true, fullName: true, avatarUrl: true } },
  creator: { select: { id: true, name: true, email: true, fullName: true } },
  subTasks: {
    include: {
      assignee: { select: { id: true, name: true, email: true, fullName: true, avatarUrl: true } },
      creator: { select: { id: true, name: true, email: true, fullName: true } },
      project: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = getWorkspaceUserId(session);

  try {
    const tasks = await prisma.task.findMany({
      where: { ownerId, parentId: null },
      include: taskInclude,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tasks);
  } catch (err) {
    console.error("[GET /api/tasks]", err);
    return NextResponse.json({ error: "Błąd pobierania zadań", detail: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkTeamPermission(session, "taskCanCreate")) {
    return NextResponse.json({ error: "Brak uprawnień do tworzenia zadań" }, { status: 403 });
  }

  const ownerId = getWorkspaceUserId(session);
  const body = await req.json();
  const { title, description, status, priority, dueDate, projectId, assigneeId, parentId } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Tytuł jest wymagany" }, { status: 400 });

  try {
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description || null,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: projectId || null,
        assigneeId: assigneeId || null,
        parentId: parentId || null,
        creatorId: session.user.id,
        ownerId,
      },
      include: taskInclude,
    });

    // Powiadomienie dla przypisanej osoby
    if (assigneeId && assigneeId !== session.user.id) {
      const creator = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, fullName: true, email: true },
      });
      const creatorName = creator?.fullName || creator?.name || creator?.email || "Ktoś";

      const notif = await prisma.notification.create({
        data: {
          userId: assigneeId,
          message: `${creatorName} przypisał/a Ci zadanie: „${task.title}"`,
          link: `/zadania`,
          type: "info",
        },
      });
      await pusherServer.trigger(`user-${assigneeId}`, "new-notification", notif);
    }

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tasks]", err);
    return NextResponse.json({ error: "Błąd tworzenia zadania", detail: String(err) }, { status: 500 });
  }
}

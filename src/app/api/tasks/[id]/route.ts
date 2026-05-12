import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { pusherServer } from "@/lib/pusher";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;

  try {
    const task = await prisma.task.findUnique({ where: { id }, include: taskInclude });
    if (!task) return NextResponse.json({ error: "Nie znaleziono zadania" }, { status: 404 });
    if (task.ownerId !== ownerId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
    return NextResponse.json(task);
  } catch (err) {
    console.error("[GET /api/tasks/:id]", err);
    return NextResponse.json({ error: "Błąd pobierania zadania" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono zadania" }, { status: 404 });
  if (existing.ownerId !== ownerId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const body = await req.json();
  const { title, description, status, priority, dueDate, projectId, assigneeId } = body;

  const prevAssigneeId = existing.assigneeId;

  try {
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description || null }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(projectId !== undefined && { projectId: projectId || null }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      },
      include: taskInclude,
    });

    // Powiadomienie gdy zmieniono assignee
    const newAssigneeId = assigneeId !== undefined ? assigneeId : prevAssigneeId;
    if (
      assigneeId !== undefined &&
      newAssigneeId &&
      newAssigneeId !== prevAssigneeId &&
      newAssigneeId !== session.user.id
    ) {
      const creator = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, fullName: true, email: true },
      });
      const creatorName = creator?.fullName || creator?.name || creator?.email || "Ktoś";

      const notif = await prisma.notification.create({
        data: {
          userId: newAssigneeId,
          message: `${creatorName} przypisał/a Ci zadanie: „${task.title}"`,
          link: `/zadania`,
          type: "info",
        },
      });
      await pusherServer.trigger(`user-${newAssigneeId}`, "new-notification", notif);
    }

    return NextResponse.json(task);
  } catch (err) {
    console.error("[PATCH /api/tasks/:id]", err);
    return NextResponse.json({ error: "Błąd aktualizacji zadania", detail: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono zadania" }, { status: 404 });
  if (existing.ownerId !== ownerId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

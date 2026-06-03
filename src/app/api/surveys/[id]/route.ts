import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { pusherServer } from "@/lib/pusher";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const survey = await prisma.survey.findFirst({
    where: { id, userId },
    include: {
      project: { select: { id: true, title: true } },
      client: { select: { id: true, name: true } },
      sections: { orderBy: { order: "asc" } },
      questions: { orderBy: { order: "asc" } },
      _count: { select: { responses: true } },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: "Nie znaleziono ankiety" }, { status: 404 });
  }

  return NextResponse.json(survey);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const survey = await prisma.survey.findFirst({ where: { id, userId } });
  if (!survey) {
    return NextResponse.json({ error: "Nie znaleziono ankiety" }, { status: 404 });
  }

  const body = await req.json();
  const { name, status, archived, pinned, order, projectId, clientId } = body;

  const updated = await prisma.survey.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(archived !== undefined ? { archived } : {}),
      ...(pinned !== undefined ? { pinned } : {}),
      ...(order !== undefined ? { order } : {}),
      ...(projectId !== undefined ? { projectId } : {}),
      ...(clientId !== undefined ? { clientId } : {}),
    },
  });

  // Notify client when survey becomes ACTIVE
  if (status === "ACTIVE" && survey.status !== "ACTIVE" && survey.clientId) {
    const pc = await prisma.projectClient.findFirst({
      where: { id: survey.clientId },
      select: { userId: true, projectId: true },
    });
    if (pc?.userId) {
      const linkProjectId = pc.projectId ?? updated.projectId;
      const notif = await prisma.notification.create({
        data: {
          userId: pc.userId,
          message: `Masz nową ankietę do wypełnienia: „${updated.name}"`,
          link: `/client/${linkProjectId}/ankiety`,
          type: "info",
        },
      });
      pusherServer.trigger(`user-${pc.userId}`, "new-notification", {
        ...notif,
        createdAt: notif.createdAt.toISOString(),
      }).catch(() => {});
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const survey = await prisma.survey.findFirst({ where: { id, userId } });
  if (!survey) {
    return NextResponse.json({ error: "Nie znaleziono ankiety" }, { status: 404 });
  }

  // Block deletion if there are completed responses
  const completedCount = await prisma.surveyResponse.count({
    where: { surveyId: id, completedAt: { not: null } },
  });
  if (completedCount > 0) {
    return NextResponse.json(
      { error: "Nie można usunąć ankiety z wypełnionymi odpowiedziami" },
      { status: 409 }
    );
  }

  await prisma.survey.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

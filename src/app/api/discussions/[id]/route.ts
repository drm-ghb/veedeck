import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const discussion = await prisma.discussion.findUnique({ where: { id } });
  if (!discussion) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (discussion.ownerId !== userId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { title, projectId, archived } = await req.json();
  if (!title && projectId === undefined && archived === undefined) return NextResponse.json({ error: "Brak danych do aktualizacji" }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (title) updateData.title = title;
  if (typeof archived === "boolean") updateData.archived = archived;

  if (projectId !== undefined) {
    if (projectId === null) {
      // Unassign from project
      updateData.projectId = null;
      updateData.type = "internal";
    } else {
      // Assign to project — verify ownership and no existing discussion
      const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
      if (!project) return NextResponse.json({ error: "Projekt nie istnieje lub brak dostępu" }, { status: 404 });
      const existingDiscussion = await prisma.discussion.findUnique({ where: { projectId } });
      if (existingDiscussion && existingDiscussion.id !== id) {
        return NextResponse.json({ error: "Projekt ma już przypisaną dyskusję" }, { status: 409 });
      }
      updateData.projectId = projectId;
      updateData.type = "project";
    }
  }

  const updated = await prisma.discussion.update({
    where: { id },
    data: updateData,
    include: { project: { select: { id: true, title: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const discussion = await prisma.discussion.findUnique({ where: { id } });
  if (!discussion) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (discussion.ownerId !== userId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  await prisma.discussion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

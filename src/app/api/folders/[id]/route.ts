import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { id } = await params;

  const folder = await prisma.folder.findUnique({
    where: { id },
    include: { room: { include: { project: { select: { userId: true } } } } },
  });

  if (!folder || folder.room.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  await prisma.folder.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const body = await req.json();

  const folder = await prisma.folder.findUnique({
    where: { id },
    include: { room: { include: { project: { select: { userId: true } } } } },
  });

  if (!folder || folder.room.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.pinned !== undefined) data.pinned = body.pinned;
  if (body.archived !== undefined) data.archived = body.archived;

  const updated = await prisma.folder.update({ where: { id }, data });
  return NextResponse.json(updated);
}

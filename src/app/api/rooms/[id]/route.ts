import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

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
  const room = await prisma.room.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!room || room.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.room.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.archived !== undefined && { archived: body.archived }),
      ...(body.pinned !== undefined && { pinned: body.pinned }),
    },
  });

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
  const room = await prisma.room.findUnique({
    where: { id },
    include: { project: true },
  });

  if (!room || room.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  await prisma.room.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const folder = await prisma.folder.findUnique({
    where: { id },
    include: { room: { include: { project: { select: { userId: true } } } } },
  });

  if (!folder || folder.room.project.userId !== session.user.id) {
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

  const { id } = await params;
  const { name } = await req.json();

  const folder = await prisma.folder.findUnique({
    where: { id },
    include: { room: { include: { project: { select: { userId: true } } } } },
  });

  if (!folder || folder.room.project.userId !== session.user.id) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const updated = await prisma.folder.update({ where: { id }, data: { name: name.trim() } });
  return NextResponse.json(updated);
}

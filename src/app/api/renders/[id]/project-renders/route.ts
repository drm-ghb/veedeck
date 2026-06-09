import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const render = await prisma.render.findUnique({
    where: { id },
    select: { projectId: true, project: { select: { userId: true } } },
  });
  if (!render || render.project.userId !== getWorkspaceUserId(session)) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const rooms = await prisma.room.findMany({
    where: { projectId: render.projectId, archived: false },
    include: {
      folders: {
        where: { archived: false },
        include: {
          renders: {
            where: { archived: false },
            select: { id: true, name: true, fileUrl: true, fileType: true, createdAt: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      renders: {
        where: { archived: false, folderId: null },
        select: { id: true, name: true, fileUrl: true, fileType: true, createdAt: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(rooms);
}

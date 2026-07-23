import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  // Verify the project belongs to this user (or their workspace owner)
  const project = await prisma.project.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rooms = await prisma.room.findMany({
    where: { projectId: id, archived: false },
    select: {
      id: true,
      name: true,
      order: true,
      folders: {
        where: { archived: false },
        select: {
          id: true,
          name: true,
          order: true,
          renders: {
            where: { archived: false },
            select: { id: true, name: true, fileUrl: true, fileType: true, order: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      renders: {
        where: { archived: false, folderId: null },
        select: { id: true, name: true, fileUrl: true, fileType: true, order: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(rooms);
}

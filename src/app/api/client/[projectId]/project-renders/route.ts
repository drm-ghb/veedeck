import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const rooms = await prisma.room.findMany({
    where: { projectId, archived: false },
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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const project = await prisma.project.findUnique({ where: { shareToken: token } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const rooms = await prisma.room.findMany({
    where: { projectId: project.id, archived: false },
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

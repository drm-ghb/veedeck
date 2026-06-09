import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; renderId: string }> }
) {
  const { token, renderId } = await params;

  const project = await prisma.project.findUnique({ where: { shareToken: token } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const render = await prisma.render.findUnique({ where: { id: renderId } });
  if (!render || render.projectId !== project.id) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  const items = await prisma.renderComparisonItem.findMany({
    where: { renderId },
    include: {
      sourceRender: {
        select: {
          id: true, name: true, fileUrl: true, fileType: true, createdAt: true,
          folder: { select: { name: true } },
          room: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(items);
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; renderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, renderId } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const render = await prisma.render.findFirst({ where: { id: renderId, projectId } });
  if (!render) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

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

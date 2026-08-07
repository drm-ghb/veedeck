import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; renderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, renderId } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const render = await prisma.render.findUnique({
    where: { id: renderId },
    select: { projectId: true },
  });
  if (!render || render.projectId !== project.id) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const pins = await prisma.renderProductPin.findMany({
    where: { renderId, archivedVersionId: null },
    include: {
      product: { select: { id: true, name: true, imageUrl: true, url: true, price: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(pins);
}

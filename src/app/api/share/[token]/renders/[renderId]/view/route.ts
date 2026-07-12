import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string; renderId: string }> }
) {
  const { token, renderId } = await params;

  const project = await prisma.project.findUnique({ where: { shareToken: token } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const render = await prisma.render.findUnique({ where: { id: renderId }, select: { projectId: true, name: true } });
  if (!render || render.projectId !== project.id) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  await prisma.render.update({ where: { id: renderId }, data: { viewCount: { increment: 1 } } });
  await prisma.clientEvent.create({
    data: {
      projectId: project.id,
      type: "render_view",
      meta: { renderId, renderName: render.name },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}

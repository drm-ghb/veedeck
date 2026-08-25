import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

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

  // 9. Log: client first render view (only if viewCount was 0 → first view ever)
  const updated = await prisma.render.findUnique({ where: { id: renderId }, select: { viewCount: true } });
  if (updated?.viewCount === 1) {
    logActivity({ level: "info", action: "client.first_view", message: `Pierwsza wizyta klienta na renderze: ${render.name}`, userId: project.userId, meta: { projectId: project.id, renderId, renderName: render.name } });
  }

  return NextResponse.json({ ok: true });
}

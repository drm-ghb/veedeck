import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; renderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, renderId } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const render = await prisma.render.findUnique({ where: { id: renderId }, select: { name: true, projectId: true } });
  await prisma.render.update({ where: { id: renderId }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  if (render?.projectId === projectId) {
    const user = session.user as any;
    await prisma.clientEvent.create({
      data: {
        projectId,
        type: "render_view",
        clientEmail: user.email ?? null,
        clientName: user.name ?? null,
        meta: { renderId, renderName: render.name },
      },
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}

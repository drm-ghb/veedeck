import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getClientProject } from "@/lib/client-access";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; renderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, renderId } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  if (!project.user.allowClientComments) {
    return NextResponse.json({ error: "Komentarze są wyłączone" }, { status: 403 });
  }

  const render = await prisma.render.findFirst({ where: { id: renderId, projectId } });
  if (!render) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const clientUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  const authorName = clientUser?.name || "Klient";

  const { content, posX, posY, title } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Treść jest wymagana" }, { status: 400 });

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      posX: posX ?? null,
      posY: posY ?? null,
      title: title?.trim() || null,
      author: authorName,
      renderId,
    },
    include: { replies: true },
  });

  await pusherServer.trigger(`render-${renderId}`, "new-comment", comment).catch(() => {});
  return NextResponse.json(comment, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const body = await req.json();
  const { viewedByDesigner, status } = body;

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: {
      renderId: true,
      render: { select: { project: { select: { userId: true } } } },
    },
  });

  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  if (comment.render.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: {
      ...(viewedByDesigner !== undefined ? { viewedByDesigner } : {}),
      ...(status !== undefined ? { status } : {}),
    },
    include: { replies: true },
  });

  if (status !== undefined) {
    await pusherServer.trigger(`render-${comment.renderId}`, "comment-updated", updated);
  }

  return NextResponse.json(updated);
}

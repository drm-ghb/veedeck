import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const render = await prisma.render.findUnique({
    where: { id },
    select: { project: { select: { userId: true } } },
  });

  if (!render || render.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  // Mark all unread chat comments (posX=null) as viewed
  await prisma.comment.updateMany({
    where: {
      renderId: id,
      posX: null,
      isInternal: false,
      isAiSummary: false,
      viewedByDesigner: false,
    },
    data: { viewedByDesigner: true },
  });

  // Mark all unread replies on this render's comments as viewed
  await prisma.reply.updateMany({
    where: {
      viewedByDesigner: false,
      comment: { renderId: id, isInternal: false },
    },
    data: { viewedByDesigner: true },
  });

  return NextResponse.json({ ok: true });
}

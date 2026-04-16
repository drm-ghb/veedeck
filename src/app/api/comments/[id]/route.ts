import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  const { viewedByDesigner } = await req.json();

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { render: { select: { project: { select: { userId: true } } } } },
  });

  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  if (comment.render.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  await prisma.comment.update({
    where: { id },
    data: { viewedByDesigner },
  });

  return NextResponse.json({ ok: true });
}

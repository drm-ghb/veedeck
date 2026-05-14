import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getWorkspaceUserId } from "@/lib/workspace";
import { MAX_LENGTHS } from "@/lib/validation";

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
  const { viewedByDesigner, status, content, title, authorName, posX, posY } = body;

  if (content !== undefined && typeof content === "string" && content.length > MAX_LENGTHS.comment) {
    return NextResponse.json({ error: "Komentarz jest zbyt długi" }, { status: 400 });
  }

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: {
      renderId: true,
      author: true,
      render: { select: { project: { select: { userId: true } } } },
    },
  });

  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  const isOwner = comment.render.project.userId === userId;
  // Use the session user's own name — never trust the client-supplied authorName for auth
  const sessionName = session.user.name ?? session.user.email ?? "";
  const isAuthor = sessionName !== "" && comment.author === sessionName;

  if (!isOwner && !isAuthor) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const isMovingPin = posX !== undefined && posY !== undefined;

  const updated = await prisma.comment.update({
    where: { id },
    data: {
      ...(isOwner && viewedByDesigner !== undefined ? { viewedByDesigner } : {}),
      ...(isOwner && status !== undefined ? { status } : {}),
      ...(isOwner && title !== undefined ? { title: title ? title.trim() : null } : {}),
      ...(isAuthor && content !== undefined ? { content: content.trim() } : {}),
      ...((isAuthor || isOwner) && isMovingPin ? { posX, posY } : {}),
    },
    include: { replies: true },
  });

  if (status !== undefined || content !== undefined) {
    await pusherServer.trigger(`render-${comment.renderId}`, "comment-updated", updated);
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Session is always required — anonymous deletion is not permitted
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = getWorkspaceUserId(session);

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

  // Only the project owner (or workspace member) may delete comments
  if (comment.render.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id } });
  await pusherServer.trigger(`render-${comment.renderId}`, "comment-deleted", { id });

  return NextResponse.json({ success: true });
}

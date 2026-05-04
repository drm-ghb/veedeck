import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id, messageId } = await params;

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Brak treści" }, { status: 400 });

  const message = await prisma.discussionMessage.findUnique({ where: { id: messageId } });
  if (!message || message.discussionId !== id) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }
  if (message.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const updated = await prisma.discussionMessage.update({
    where: { id: messageId },
    data: { content: content.trim(), editedAt: new Date() },
  });

  await pusherServer.trigger(`discussion-${id}`, "message-edited", {
    id: messageId,
    content: updated.content,
    editedAt: updated.editedAt,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id, messageId } = await params;

  const message = await prisma.discussionMessage.findUnique({ where: { id: messageId } });
  if (!message || message.discussionId !== id) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }
  if (message.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  await prisma.discussionMessage.delete({ where: { id: messageId } });

  await pusherServer.trigger(`discussion-${id}`, "message-deleted", { id: messageId });

  return NextResponse.json({ success: true });
}

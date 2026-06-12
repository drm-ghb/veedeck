import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id, messageId } = await params;

  const discussion = await prisma.discussion.findUnique({ where: { id } });
  if (!discussion) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (discussion.ownerId !== userId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { emoji } = await req.json();
  if (!emoji) return NextResponse.json({ error: "Brak emoji" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { name: true, fullName: true, email: true },
  });
  const userName = user?.fullName || user?.name || user?.email || "Projektant";

  // Toggle: delete if exists, create if not
  const existing = await prisma.discussionMessageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId: session.user.id!, emoji } },
  });

  if (existing) {
    await prisma.discussionMessageReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.discussionMessageReaction.create({
      data: { messageId, userId: session.user.id!, userName, emoji },
    });
  }

  const reactions = await prisma.discussionMessageReaction.findMany({
    where: { messageId },
    select: { userId: true, userName: true, emoji: true },
  });

  await pusherServer.trigger(`discussion-${id}`, "reaction-updated", { messageId, reactions });

  return NextResponse.json({ messageId, reactions });
}

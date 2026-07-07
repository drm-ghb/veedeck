import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await req.json();

  const updated = await prisma.helpRequest.update({
    where: { id },
    data: { status },
    include: { discussion: true },
  });

  // On close: post system message in linked discussion
  if (status === "closed" && updated.discussion) {
    const sysMsg = await prisma.discussionMessage.create({
      data: {
        discussionId: updated.discussion.id,
        content: "Zgłoszenie zostało zamknięte przez administratora.",
        authorName: "System",
        userId: null,
        sourceType: "system_close",
      },
    });
    await prisma.discussion.update({
      where: { id: updated.discussion.id },
      data: { updatedAt: new Date() },
    });
    await pusherServer.trigger(`discussion-${updated.discussion.id}`, "new-message", sysMsg);
  }

  return NextResponse.json(updated);
}

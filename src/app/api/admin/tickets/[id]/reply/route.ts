import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { replyText, attachments } = await req.json();
  // attachments: [{url, name, type}]
  const files: { url: string; name: string; type: string }[] = attachments ?? [];
  if (!replyText?.trim() && files.length === 0) {
    return NextResponse.json({ error: "Treść odpowiedzi lub załącznik jest wymagany" }, { status: 400 });
  }

  const ticket = await prisma.helpRequest.findUnique({
    where: { id },
    include: { discussion: true },
  });
  if (!ticket) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  if (!ticket.userId) {
    return NextResponse.json({ error: "Zgłoszenie nie ma powiązanego konta użytkownika" }, { status: 400 });
  }

  let discussion = ticket.discussion;

  if (!discussion) {
    // Create discussion and seed with ticket content as first message
    discussion = await prisma.discussion.create({
      data: {
        title: "Dział Wsparcia",
        type: "support",
        ownerId: ticket.userId,
        helpRequestId: id,
      },
    });

    await prisma.discussionMessage.create({
      data: {
        discussionId: discussion.id,
        content: ticket.message,
        authorName: "Dział Wsparcia",
        userId: null,
        sourceType: "help_request",
      },
    });
  }

  // Text message (if any)
  let lastMessage = null;
  if (replyText?.trim()) {
    lastMessage = await prisma.discussionMessage.create({
      data: {
        discussionId: discussion.id,
        content: replyText.trim(),
        authorName: "Dział Wsparcia",
        userId: null,
        sourceType: "chat",
      },
    });
    await pusherServer.trigger(`discussion-${discussion.id}`, "new-message", lastMessage);
  }

  // One message per attachment
  for (const file of files) {
    lastMessage = await prisma.discussionMessage.create({
      data: {
        discussionId: discussion.id,
        content: "",
        authorName: "Dział Wsparcia",
        userId: null,
        sourceType: "chat",
        attachmentUrl: file.url,
        attachmentName: file.name,
        attachmentType: file.type,
      },
    });
    await pusherServer.trigger(`discussion-${discussion.id}`, "new-message", lastMessage);
  }

  await prisma.discussion.update({
    where: { id: discussion.id },
    data: { updatedAt: new Date() },
  });

  if (ticket.status === "open") {
    await prisma.helpRequest.update({ where: { id }, data: { status: "in_progress" } });
  }

  return NextResponse.json({ discussionId: discussion.id, ok: true });
}

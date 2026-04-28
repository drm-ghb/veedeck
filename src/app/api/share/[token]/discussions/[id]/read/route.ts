import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { token, id } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    select: { archived: true, shareExpiresAt: true, discussion: { select: { id: true } } },
  });

  if (!project || project.archived) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (project.shareExpiresAt && new Date() > new Date(project.shareExpiresAt)) {
    return NextResponse.json({ error: "Link wygasł" }, { status: 410 });
  }
  if (!project.discussion || project.discussion.id !== id) {
    return NextResponse.json({ error: "Nie znaleziono dyskusji" }, { status: 404 });
  }

  const { lastMessageId, authorName } = await req.json();
  if (!lastMessageId || !authorName?.trim()) {
    return NextResponse.json({ error: "lastMessageId i authorName wymagane" }, { status: 400 });
  }

  const readerId = `client:${authorName.trim()}`;

  const receipt = await prisma.discussionReadReceipt.upsert({
    where: { discussionId_readerId: { discussionId: id, readerId } },
    update: { lastMessageId, readerName: authorName.trim(), readAt: new Date() },
    create: {
      discussionId: id,
      readerId,
      readerName: authorName.trim(),
      readerType: "client",
      lastMessageId,
    },
  });

  await pusherServer.trigger(`discussion-${id}`, "read-receipt", {
    readerId: receipt.readerId,
    readerName: receipt.readerName,
    readerType: receipt.readerType,
    lastMessageId: receipt.lastMessageId,
  });

  return NextResponse.json(receipt);
}

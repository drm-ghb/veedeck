import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function GET(
  _req: NextRequest,
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

  const [messages, receipts] = await Promise.all([
    prisma.discussionMessage.findMany({
      where: { discussionId: id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.discussionReadReceipt.findMany({ where: { discussionId: id } }),
  ]);

  return NextResponse.json({ messages, receipts });
}

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

  const { content, authorName, clientEmail, attachmentUrl, attachmentName, attachmentType } = await req.json();
  if ((!content?.trim() && !attachmentUrl) || !authorName?.trim()) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  const message = await prisma.discussionMessage.create({
    data: {
      discussionId: id,
      content: content?.trim() || "",
      authorName: authorName.trim(),
      clientEmail: clientEmail ?? null,
      sourceType: "chat",
      attachmentUrl: attachmentUrl ?? null,
      attachmentName: attachmentName ?? null,
      attachmentType: attachmentType ?? null,
    },
  });

  await prisma.discussion.update({ where: { id }, data: { updatedAt: new Date() } });
  await pusherServer.trigger(`discussion-${id}`, "new-message", message);

  return NextResponse.json(message, { status: 201 });
}

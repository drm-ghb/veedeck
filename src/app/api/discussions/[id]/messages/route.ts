import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const discussion = await prisma.discussion.findUnique({ where: { id } });
  if (!discussion) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (discussion.ownerId !== userId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const messages = await prisma.discussionMessage.findMany({
    where: { discussionId: id },
    orderBy: { createdAt: "asc" },
    include: { reactions: { select: { userId: true, userName: true, emoji: true } } },
  });

  const receipts = await prisma.discussionReadReceipt.findMany({
    where: { discussionId: id },
  }).catch(() => []);

  return NextResponse.json({ messages, receipts });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const discussion = await prisma.discussion.findUnique({ where: { id } });
  if (!discussion) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (discussion.ownerId !== userId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { content, attachmentUrl, attachmentName, attachmentType, replyToId, replyToContent, replyToAuthor } = await req.json();
  if (!content?.trim() && !attachmentUrl) return NextResponse.json({ error: "Treść lub załącznik jest wymagany" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { name: true, email: true },
  });

  let message;
  try {
    message = await prisma.discussionMessage.create({
      data: {
        discussionId: id,
        content: content?.trim() || "",
        authorName: user?.name || user?.email || "Projektant",
        userId: session.user.id!,
        sourceType: "chat",
        attachmentUrl: attachmentUrl ?? null,
        attachmentName: attachmentName ?? null,
        attachmentType: attachmentType ?? null,
        replyToId: replyToId ?? null,
        replyToContent: replyToContent ?? null,
        replyToAuthor: replyToAuthor ?? null,
      },
    });
  } catch (e) {
    console.error("[discussions/messages POST] prisma.create error:", e);
    return NextResponse.json({ error: "Błąd bazy danych", detail: String(e) }, { status: 500 });
  }

  await prisma.discussion.update({ where: { id }, data: { updatedAt: new Date() } });
  await pusherServer.trigger(`discussion-${id}`, "new-message", message);

  // Notify contractor's panel if this is a contractor discussion
  if (discussion.contractorAssignmentId) {
    await pusherServer.trigger(
      `contractor-assignment-${discussion.contractorAssignmentId}`,
      "new-message",
      message
    );
  }

  // Notify client panel if this is a project discussion
  if (discussion.projectId) {
    await pusherServer.trigger(`project-${discussion.projectId}`, "new-message", {
      discussionId: id,
    });
  }

  return NextResponse.json(message, { status: 201 });
}

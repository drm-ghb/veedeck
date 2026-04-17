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

  const cursor = req.nextUrl.searchParams.get("cursor");
  const messages = await prisma.discussionMessage.findMany({
    where: { discussionId: id },
    orderBy: { createdAt: "asc" },
    take: 50,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return NextResponse.json(messages);
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

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Treść jest wymagana" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { name: true, email: true },
  });

  const message = await prisma.discussionMessage.create({
    data: {
      discussionId: id,
      content: content.trim(),
      authorName: user?.name || user?.email || "Projektant",
      userId: session.user.id!,
      sourceType: "chat",
    },
  });

  await prisma.discussion.update({ where: { id }, data: { updatedAt: new Date() } });
  await pusherServer.trigger(`discussion-${id}`, "new-message", message);

  return NextResponse.json(message, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getClientProject } from "@/lib/client-access";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function verifyAccess(session: any, projectId: string, id: string) {
  if (!session?.user?.id) return null;
  const project = await getClientProject(session as any, projectId);
  if (!project) return null;
  const discussion = await prisma.discussion.findFirst({ where: { id, projectId } });
  return discussion;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, id } = await params;
  const discussion = await verifyAccess(session, projectId, id);
  if (!discussion) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const messages = await prisma.discussionMessage.findMany({
    where: { discussionId: id },
    orderBy: { createdAt: "asc" },
  });

  const receipts = await prisma.discussionReadReceipt.findMany({
    where: { discussionId: id },
  }).catch(() => []);

  return NextResponse.json({ messages, receipts });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, id } = await params;
  const discussion = await verifyAccess(session, projectId, id);
  if (!discussion) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const clientUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  const authorName = clientUser?.name || "Klient";

  const { content, attachmentUrl, attachmentName, attachmentType } = await req.json();
  if (!content?.trim() && !attachmentUrl) {
    return NextResponse.json({ error: "Treść lub załącznik jest wymagany" }, { status: 400 });
  }

  const message = await prisma.discussionMessage.create({
    data: {
      discussionId: id,
      content: content?.trim() || "",
      authorName,
      userId: session.user.id,
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

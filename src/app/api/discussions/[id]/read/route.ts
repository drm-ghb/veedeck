import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getWorkspaceUserId } from "@/lib/workspace";

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

  const { lastMessageId } = await req.json();
  if (!lastMessageId) return NextResponse.json({ error: "lastMessageId wymagany" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { name: true, email: true },
  });
  const readerName = user?.name || user?.email || "Projektant";

  // Use the actual session user ID (not workspace ID) so team members track
  // their own read position independently from the workspace owner.
  const readerId = session.user.id!;

  const receipt = await prisma.discussionReadReceipt.upsert({
    where: { discussionId_readerId: { discussionId: id, readerId } },
    update: { lastMessageId, readerName, readAt: new Date() },
    create: {
      discussionId: id,
      readerId,
      readerName,
      readerType: "designer",
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

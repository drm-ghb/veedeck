import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getClientProject } from "@/lib/client-access";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, id } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const discussion = await prisma.discussion.findFirst({ where: { id, projectId } });
  if (!discussion) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const clientUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  const readerName = clientUser?.name || "Klient";
  const readerId = `client:${session.user.id}`;

  const { lastMessageId } = await req.json();

  const receipt = await prisma.discussionReadReceipt.upsert({
    where: { discussionId_readerId: { discussionId: id, readerId } },
    update: { lastMessageId: lastMessageId ?? null, readAt: new Date(), readerName },
    create: {
      discussionId: id,
      readerId,
      readerName,
      readerType: "client",
      lastMessageId: lastMessageId ?? null,
    },
  });

  await pusherServer.trigger(`discussion-${id}`, "read-receipt", receipt).catch(() => {});
  return NextResponse.json(receipt);
}

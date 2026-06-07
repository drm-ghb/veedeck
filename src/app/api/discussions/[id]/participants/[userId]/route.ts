import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const currentUserId = getWorkspaceUserId(session);
  const { id, userId } = await params;

  const discussion = await prisma.discussion.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!discussion) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (discussion.ownerId !== currentUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.discussionParticipant.deleteMany({
    where: { discussionId: id, userId },
  });

  return NextResponse.json({ ok: true });
}

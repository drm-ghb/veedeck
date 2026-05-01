import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";

export async function GET(
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

  const readerId = `client:${session.user.id}`;
  const receipt = await prisma.discussionReadReceipt.findUnique({
    where: { discussionId_readerId: { discussionId: id, readerId } },
  });

  // Count messages sent by designer (userId = designer, not a client role user)
  // after the last read time
  const since = req.nextUrl.searchParams.get("since");
  const afterDate = receipt?.readAt ?? (since ? new Date(since) : null);

  if (!afterDate) {
    // Never read — count all designer messages
    const count = await prisma.discussionMessage.count({
      where: {
        discussionId: id,
        userId: { not: session.user.id }, // not from this client
      },
    });
    return NextResponse.json({ count });
  }

  const count = await prisma.discussionMessage.count({
    where: {
      discussionId: id,
      userId: { not: session.user.id },
      createdAt: { gt: afterDate },
    },
  });

  return NextResponse.json({ count });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const discussions = await prisma.discussion.findMany({
    where: { ownerId: userId },
    include: {
      project: { select: { id: true, title: true } },
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      readReceipts: {
        where: { readerId: userId },
        include: { lastMessage: { select: { createdAt: true } } },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = await Promise.all(
    discussions.map(async (d) => {
      const receipt = d.readReceipts[0];
      const lastReadAt = receipt?.lastMessage?.createdAt ?? null;

      const unreadCount = await prisma.discussionMessage.count({
        where: {
          discussionId: d.id,
          OR: [{ userId: { not: userId } }, { userId: null }],
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      });

      return {
        ...d,
        myReadMessageId: receipt?.lastMessageId ?? null,
        unreadCount,
      };
    })
  );

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { title, type, projectId, contractorAssignmentId } = await req.json();
  if (!title) return NextResponse.json({ error: "Tytuł jest wymagany" }, { status: 400 });

  const data: Record<string, unknown> = {
    title,
    type: contractorAssignmentId ? "contractor" : (type ?? "internal"),
    ownerId: userId,
  };

  if (contractorAssignmentId) {
    const assignment = await prisma.contractorAssignment.findFirst({
      where: { id: contractorAssignmentId, designerId: userId },
    });
    if (!assignment) return NextResponse.json({ error: "Brak dostępu do przypisania" }, { status: 403 });
    data.contractorAssignmentId = contractorAssignmentId;
  } else if (projectId) {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) return NextResponse.json({ error: "Projekt nie istnieje" }, { status: 404 });
    data.projectId = projectId;
    data.type = "project";
  }

  const discussion = await prisma.discussion.create({ data });

  return NextResponse.json(discussion, { status: 201 });
}

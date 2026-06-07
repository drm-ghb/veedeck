import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { pusherServer } from "@/lib/pusher";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  // Detect if team member (has ownerId)
  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { ownerId: true } });
  const isTeamMember = !!dbUser?.ownerId;

  const where = isTeamMember
    ? { participants: { some: { userId } } }
    : { ownerId: userId };

  const discussions = await prisma.discussion.findMany({
    where,
    include: {
      project: { select: { id: true, title: true } },
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      readReceipts: {
        where: { readerId: userId },
        include: { lastMessage: { select: { createdAt: true } } },
        take: 1,
      },
      participants: {
        include: {
          user: { select: { id: true, name: true, fullName: true, avatarUrl: true, role: true } },
        },
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

  const { title, type, projectId, contractorAssignmentId, participantIds = [] } = await req.json();
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
    data.type = type === "internal" ? "internal" : "project";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const discussion = await prisma.discussion.create({ data: data as any });

  // Add participants
  const validParticipantIds = Array.isArray(participantIds)
    ? (participantIds as string[]).filter(Boolean)
    : [];

  if (validParticipantIds.length > 0) {
    await prisma.discussionParticipant.createMany({
      data: validParticipantIds.map((uid: string) => ({
        discussionId: discussion.id,
        userId: uid,
      })),
      skipDuplicates: true,
    });

    // Notify each participant
    const designerName = (await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, fullName: true },
    }));
    const senderName = designerName?.fullName || designerName?.name || "Projektant";

    await Promise.all(
      validParticipantIds.map(async (uid: string) => {
        await pusherServer.trigger(`user-${uid}`, "added-to-discussion", {
          discussionId: discussion.id,
          title: discussion.title,
          addedBy: senderName,
        });
        await prisma.notification.create({
          data: {
            userId: uid,
            message: `${senderName} dodał Cię do dyskusji „${discussion.title}"`,
            link: `/dyskusje`,
            type: "discussion_added",
          },
        });
      })
    );
  }

  const full = await prisma.discussion.findUnique({
    where: { id: discussion.id },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, fullName: true, avatarUrl: true, role: true } },
        },
      },
    },
  });

  return NextResponse.json(full, { status: 201 });
}

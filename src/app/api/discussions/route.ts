import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { pusherServer } from "@/lib/pusher";
import { getAllowedClientIds, hasPermission } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await hasPermission(session, "dyskusje", 1)) return NextResponse.json({ error: "Brak dostępu do modułu Dyskusje" }, { status: 403 });
  const userId = getWorkspaceUserId(session);
  // Use raw session ID for per-user read tracking (team members have independent read positions)
  const sessionUserId = session.user.id!;
  const allowedIds = await getAllowedClientIds(session);

  // Detect if team member (has ownerId) or client
  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { ownerId: true, role: true } });
  const isTeamMember = !!dbUser?.ownerId;
  const isClient = dbUser?.role === "client";

  const where = isTeamMember || isClient
    ? { participants: { some: { userId: sessionUserId } } }
    : {
        ownerId: userId,
        ...(allowedIds ? { project: { clientId: { in: allowedIds } } } : {}),
      };

  const discussions = await prisma.discussion.findMany({
    where,
    include: {
      project: { select: { id: true, title: true } },
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      readReceipts: {
        where: { readerId: { in: [sessionUserId, `client:${sessionUserId}`] } },
        include: { lastMessage: { select: { createdAt: true } } },
        orderBy: { readAt: "desc" },
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
          OR: [{ userId: { not: sessionUserId } }, { userId: null }],
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

  // Notify the owner's NavSidebar so it subscribes to the new channel immediately
  pusherServer.trigger(`user-${userId}`, "new-discussion", {
    discussionId: discussion.id,
    hasMessage: false,
  }).catch(() => {});

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

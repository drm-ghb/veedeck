import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { getAllowedClientIds } from "@/lib/permissions";
import { redirect } from "next/navigation";
import DyskusjeView from "@/components/dyskusje/DyskusjeView";

export default async function DyskusjePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = getWorkspaceUserId(session);
  const allowedIds = await getAllowedClientIds(session);

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true, ownerId: true, name: true, fullName: true },
  });

  const isTeamMember = !!dbUser?.ownerId;
  // For team members: the workspace owner is the designer
  const workspaceOwnerId = isTeamMember ? dbUser!.ownerId! : userId;

  const sessionUserId = session.user!.id!;

  const discussionsWhere = isTeamMember
    ? { participants: { some: { userId } } }
    : {
        ownerId: userId,
        ...(allowedIds ? { project: { clientId: { in: allowedIds } } } : {}),
      };

  const [discussions, projects, teamMembers] = await Promise.all([
    prisma.discussion.findMany({
      where: discussionsWhere,
      include: {
        project: { select: { id: true, title: true } },
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        readReceipts: {
          where: { readerId: sessionUserId },
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
    }),
    // Projects belong to workspace owner (designer)
    prisma.project.findMany({
      where: { userId: workspaceOwnerId, archived: false },
      select: {
        id: true,
        title: true,
        contractorAssignments: { where: { archived: false }, select: { id: true }, take: 1 },
      },
      orderBy: { title: "asc" },
    }),
    // Team members of workspace owner
    prisma.user.findMany({
      where: { ownerId: workspaceOwnerId },
      select: { id: true, name: true, fullName: true, avatarUrl: true },
    }),
  ]);

  // Auto-migrate: add client contacts as participants for project discussions
  const projectDiscussions = discussions.filter((d) => d.projectId && d.type !== "contractor");
  if (projectDiscussions.length > 0 && !isTeamMember) {
    const projectIds = [...new Set(projectDiscussions.map((d) => d.projectId!))];
    const projectsWithClients = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        client: { select: { contacts: { where: { userId: { not: null } }, select: { userId: true } } } },
        clients: { where: { userId: { not: null } }, select: { userId: true } },
      },
    });
    const toCreate: { discussionId: string; userId: string }[] = [];
    for (const proj of projectsWithClients) {
      const clientUserIds = [
        ...(proj.client?.contacts ?? []).map((c) => c.userId),
        ...(proj.clients ?? []).map((c) => c.userId),
      ].filter((id): id is string => !!id);
      const discIds = projectDiscussions.filter((d) => d.projectId === proj.id).map((d) => d.id);
      for (const discId of discIds) {
        for (const uid of clientUserIds) toCreate.push({ discussionId: discId, userId: uid });
      }
    }
    if (toCreate.length > 0) {
      await prisma.discussionParticipant.createMany({ data: toCreate, skipDuplicates: true });
    }
  }

  const discussionsWithUnread = await Promise.all(
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
      return { ...d, myReadMessageId: receipt?.lastMessageId ?? null, unreadCount };
    })
  );

  return (
    <DyskusjeView
      currentUserId={sessionUserId}
      currentUserAvatarUrl={dbUser?.avatarUrl ?? null}
      isTeamMember={isTeamMember}
      initialDiscussions={discussionsWithUnread.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        projectId: d.projectId,
        project: d.project,
        messageCount: d._count.messages,
        lastMessage: d.messages[0]
          ? {
              id: d.messages[0].id,
              content: d.messages[0].content,
              authorName: d.messages[0].authorName,
              createdAt: d.messages[0].createdAt.toISOString(),
            }
          : null,
        myReadMessageId: d.myReadMessageId,
        unreadCount: d.unreadCount,
        contractorAssignmentId: d.contractorAssignmentId ?? null,
        archived: d.archived,
        updatedAt: d.updatedAt.toISOString(),
        participants: d.participants.map((p) => ({
          userId: p.userId,
          name: p.user.fullName || p.user.name || "",
          avatarUrl: p.user.avatarUrl ?? null,
          role: p.user.role,
        })),
      }))}
      projects={projects.map((p) => ({
        id: p.id,
        title: p.title,
        contractorAssignmentId: p.contractorAssignments[0]?.id ?? null,
      }))}
      teamMembers={teamMembers.map((u) => ({
        id: u.id,
        name: u.fullName || u.name || "",
        avatarUrl: u.avatarUrl ?? null,
      }))}
    />
  );
}

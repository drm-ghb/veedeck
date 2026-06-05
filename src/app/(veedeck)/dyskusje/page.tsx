import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { redirect } from "next/navigation";
import DyskusjeView from "@/components/dyskusje/DyskusjeView";

export default async function DyskusjePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = getWorkspaceUserId(session);

  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });

  const [discussions, projects] = await Promise.all([
    prisma.discussion.findMany({
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
    }),
    prisma.project.findMany({
      where: { userId, archived: false },
      select: {
        id: true,
        title: true,
        contractorAssignments: { where: { archived: false }, select: { id: true }, take: 1 },
      },
      orderBy: { title: "asc" },
    }),
  ]);

  const discussionsWithUnread = await Promise.all(
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
      return { ...d, myReadMessageId: receipt?.lastMessageId ?? null, unreadCount };
    })
  );

  return (
    <DyskusjeView
      currentUserId={userId}
      currentUserAvatarUrl={dbUser?.avatarUrl ?? null}
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
      }))}
      projects={projects.map((p) => ({
        id: p.id,
        title: p.title,
        contractorAssignmentId: p.contractorAssignments[0]?.id ?? null,
      }))}
    />
  );
}

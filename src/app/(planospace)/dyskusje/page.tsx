import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { redirect } from "next/navigation";
import DyskusjeView from "@/components/dyskusje/DyskusjeView";

export default async function DyskusjePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = getWorkspaceUserId(session);

  const discussions = await prisma.discussion.findMany({
    where: { ownerId: userId },
    include: {
      project: { select: { id: true, title: true } },
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <DyskusjeView
      initialDiscussions={discussions.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        projectId: d.projectId,
        project: d.project,
        messageCount: d._count.messages,
        lastMessage: d.messages[0]
          ? {
              content: d.messages[0].content,
              authorName: d.messages[0].authorName,
              createdAt: d.messages[0].createdAt.toISOString(),
            }
          : null,
        updatedAt: d.updatedAt.toISOString(),
      }))}
    />
  );
}

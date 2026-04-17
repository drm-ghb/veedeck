import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import ListyView from "@/components/listy/ListyView";

export default async function ListyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = getWorkspaceUserId(session);

  const lists = await prisma.shoppingList.findMany({
    where: { userId },
    include: { project: { select: { id: true, title: true, hiddenModules: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ListyView
      lists={lists.map((l) => ({
        id: l.id,
        slug: l.slug,
        name: l.name,
        shareToken: l.shareToken ?? "",
        archived: l.archived,
        pinned: l.pinned,
        createdAt: l.createdAt.toISOString(),
        project: l.project ? { id: l.project.id, title: l.project.title, hiddenModules: l.project.hiddenModules } : null,
      }))}
    />
  );
}

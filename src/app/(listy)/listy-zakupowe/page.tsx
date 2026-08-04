import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { getAllowedClientIds, hasPermission } from "@/lib/permissions";
import ListyView from "@/components/listy/ListyView";

export default async function ListyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = getWorkspaceUserId(session);
  const [allowedIds, canManage] = await Promise.all([
    getAllowedClientIds(session),
    hasPermission(session, "listy", 3),
  ]);

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { extensionKey: true },
  });
  const veepickConnected = !!userRecord?.extensionKey;

  const lists = await prisma.shoppingList.findMany({
    where: {
      userId,
      ...(allowedIds ? {
        OR: [
          { project: { clientId: { in: allowedIds } } },
          { clientId: { in: allowedIds } },
        ],
      } : {}),
    },
    select: {
      id: true, slug: true, name: true, shareToken: true, archived: true,
      pinned: true, order: true, createdAt: true, viewCount: true,
      clientId: true,
      client: { select: { id: true, name: true, accentColor: true } },
      project: {
        select: {
          id: true, title: true, hiddenModules: true, slug: true,
          clientName: true,
          client: { select: { name: true, accentColor: true } },
          clients: { where: { isMainContact: true }, select: { userId: true }, take: 1 },
        },
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return (
    <ListyView
      userId={userId}
      veepickConnected={veepickConnected}
      canManage={canManage}
      lists={lists.map((l) => ({
        id: l.id,
        slug: l.slug,
        name: l.name,
        shareToken: l.shareToken ?? "",
        archived: l.archived,
        pinned: l.pinned,
        order: l.order,
        createdAt: l.createdAt.toISOString(),
        viewCount: l.viewCount,
        directClientId: l.clientId ?? l.client?.id ?? null,
        directClientName: l.client?.name ?? null,
        directClientAccentColor: l.client?.accentColor ?? null,
        project: l.project ? {
          id: l.project.id,
          title: l.project.title,
          clientName: l.project.client?.name ?? l.project.clientName ?? null,
          accentColor: l.project.client?.accentColor ?? null,
          hiddenModules: l.project.hiddenModules,
          clientHasNoAccount: !!(l.project.clientName) && !(l.project.clients[0]?.userId),
        } : null,
      }))}
    />
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardView from "@/components/dashboard/DashboardView";
import { getWorkspaceUserId } from "@/lib/workspace";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = getWorkspaceUserId(session);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { globalHiddenModules: true, navMode: true, name: true, email: true },
  });

  const hiddenModules = user?.globalHiddenModules ?? [];
  const navMode = user?.navMode ?? "sidebar";
  const displayName = user?.name || user?.email || null;

  // Fetch all active projects (for stats + recent + requests)
  const allProjects = await prisma.project.findMany({
    where: { userId, archived: false },
    select: {
      id: true,
      slug: true,
      title: true,
      clientName: true,
      updatedAt: true,
      renders: {
        where: { archived: false },
        select: { fileUrl: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { renders: { where: { archived: false } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const projectIds = allProjects.map((p) => p.id);
  const activeProjectCount = allProjects.length;
  const projectMap = new Map(allProjects.map((p) => [p.id, p]));

  const [recentProjects, recentLists] = await Promise.all([prisma.project.findMany({
    where: { userId, archived: false, modules: { has: "renderflow" } },
    select: {
      id: true,
      slug: true,
      title: true,
      clientName: true,
      pinned: true,
      updatedAt: true,
      renders: {
        where: { archived: false },
        select: { fileUrl: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { renders: { where: { archived: false } } } },
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 3,
  }),

  prisma.shoppingList.findMany({
    where: { userId, archived: false },
    select: {
      id: true,
      slug: true,
      name: true,
      pinned: true,
      updatedAt: true,
      project: { select: { title: true } },
      _count: { select: { sections: true } },
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 3,
  }),
  ]);

  // Fetch ±1 day UTC to cover all timezones; client filters to local "today"
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  todayStart.setUTCDate(todayStart.getUTCDate() - 1);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

  const [renderflowProjectCount, listCount, notificationCount, todayEvents, pins, statusRequests, versionRequests, renderDiscussions, listMessages] =
    await Promise.all([
      prisma.project.count({ where: { userId, archived: false, modules: { has: "renderflow" } } }),
      prisma.shoppingList.count({ where: { userId, archived: false } }),
      prisma.notification.count({ where: { userId, read: false } }),

      // Today's calendar events
      prisma.calendarEvent.findMany({
        where: {
          userId,
          startAt: { gte: todayStart, lte: todayEnd },
        },
        select: { id: true, title: true, type: true, startAt: true, endAt: true },
        orderBy: { startAt: "asc" },
      }),

      // Unviewed pins (NEW status, not yet viewed by designer, with position = pin)
      prisma.comment.findMany({
        where: {
          posX: { not: null },
          status: "NEW",
          isInternal: false,
          viewedByDesigner: false,
          render: { project: { userId }, archived: false },
        },
        select: {
          id: true,
          title: true,
          content: true,
          author: true,
          createdAt: true,
          renderId: true,
          render: {
            select: {
              name: true,
              projectId: true,
              project: { select: { id: true, title: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Pending status change requests
      projectIds.length > 0
        ? prisma.statusChangeRequest.findMany({
            where: { projectId: { in: projectIds }, status: "PENDING" },
            orderBy: { createdAt: "desc" },
            take: 10,
          })
        : Promise.resolve([]),

      // Pending version restore requests
      projectIds.length > 0
        ? prisma.versionRestoreRequest.findMany({
            where: { projectId: { in: projectIds }, status: "PENDING" },
            orderBy: { createdAt: "desc" },
            take: 10,
          })
        : Promise.resolve([]),

      // Unread render discussions (non-pin comments from clients)
      prisma.comment.findMany({
        where: {
          posX: null,
          isInternal: false,
          isAiSummary: false,
          viewedByDesigner: false,
          render: { project: { userId }, archived: false },
        },
        select: {
          id: true,
          content: true,
          author: true,
          createdAt: true,
          renderId: true,
          render: {
            select: {
              name: true,
              projectId: true,
              project: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Unread shopping list comments
      prisma.listProductComment.findMany({
        where: {
          viewedByDesigner: false,
          product: { section: { list: { userId } } },
        },
        select: {
          id: true,
          content: true,
          author: true,
          createdAt: true,
          productId: true,
          product: {
            select: {
              name: true,
              section: {
                select: {
                  list: { select: { id: true, name: true, slug: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  const todayEventsFormatted = todayEvents.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type as string,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt?.toISOString() ?? null,
  }));

  return (
    <DashboardView
      displayName={displayName}
      userId={userId}
      navMode={navMode}
      hiddenModules={hiddenModules}
      stats={{
        projects: activeProjectCount,
        renderflowProjects: renderflowProjectCount,
        lists: listCount,
        notificationCount,
      }}
      recentProjects={recentProjects.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        clientName: p.clientName,
        pinned: p.pinned,
        renderCount: p._count.renders,
        lastRenderUrl: p.renders[0]?.fileUrl ?? null,
        updatedAt: p.updatedAt.toISOString(),
      }))}
      pins={pins.map((c) => ({
        id: c.id,
        title: c.title,
        content: c.content,
        author: c.author,
        createdAt: c.createdAt.toISOString(),
        renderId: c.renderId,
        renderName: c.render.name,
        projectId: c.render.project.id,
        projectTitle: c.render.project.title,
        projectSlug: c.render.project.slug,
      }))}
      statusRequests={statusRequests.map((r) => ({
        id: r.id,
        renderName: r.renderName,
        clientName: r.clientName ?? null,
        projectId: r.projectId,
        projectTitle: projectMap.get(r.projectId)?.title ?? "",
        projectSlug: projectMap.get(r.projectId)?.slug ?? null,
        createdAt: r.createdAt.toISOString(),
      }))}
      versionRequests={versionRequests.map((r) => ({
        id: r.id,
        renderName: r.renderName,
        clientName: r.clientName ?? null,
        projectId: r.projectId,
        projectTitle: projectMap.get(r.projectId)?.title ?? "",
        projectSlug: projectMap.get(r.projectId)?.slug ?? null,
        createdAt: r.createdAt.toISOString(),
      }))}
      recentLists={recentLists.map((l) => ({
        id: l.id,
        slug: l.slug,
        name: l.name,
        pinned: l.pinned,
        projectTitle: l.project?.title ?? null,
        sectionCount: l._count.sections,
        updatedAt: l.updatedAt.toISOString(),
      }))}
      renderDiscussions={renderDiscussions.map((c) => ({
        id: c.id,
        content: c.content,
        author: c.author,
        createdAt: c.createdAt.toISOString(),
        renderId: c.renderId,
        renderName: c.render.name,
        projectId: c.render.project.id,
        projectTitle: c.render.project.title,
      }))}
      todayEvents={todayEventsFormatted}
      listMessages={listMessages.map((c) => ({
        id: c.id,
        content: c.content,
        author: c.author,
        createdAt: c.createdAt.toISOString(),
        productId: c.productId,
        productName: c.product.name,
        listId: c.product.section.list.id,
        listName: c.product.section.list.name,
        listSlug: c.product.section.list.slug,
      }))}
    />
  );
}

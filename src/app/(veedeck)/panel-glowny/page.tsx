import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardView from "@/components/dashboard/DashboardView";
import { getWorkspaceUserId } from "@/lib/workspace";
import { getAllowedClientIds } from "@/lib/permissions";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = getWorkspaceUserId(session);
  const allowedIds = await getAllowedClientIds(session);
  const clientFilter = allowedIds ? { clientId: { in: allowedIds } } : {};
  const listClientFilter = allowedIds ? { project: { clientId: { in: allowedIds } } } : {};

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { globalHiddenModules: true, name: true, fullName: true, email: true },
  });

  const hiddenModules = user?.globalHiddenModules ?? [];
  const displayName = (user?.fullName || user?.name || user?.email)?.split(" ")[0] ?? null;

  // Fetch all active projects (for stats + recent + requests)
  const allProjects = await prisma.project.findMany({
    where: { userId, archived: false, ...clientFilter },
    select: {
      id: true,
      slug: true,
      title: true,
      clientName: true,
      updatedAt: true,
      renders: {
        where: { archived: false },
        select: { fileUrl: true, fileType: true },
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

  const [recentProjectsCandidates, recentLists] = await Promise.all([prisma.project.findMany({
    where: { userId, archived: false, modules: { has: "renderflow" }, ...clientFilter },
    select: {
      id: true,
      slug: true,
      title: true,
      clientName: true,
      client: { select: { name: true } },
      pinned: true,
      updatedAt: true,
      renders: {
        where: { archived: false },
        select: { fileUrl: true, fileType: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { renders: { where: { archived: false } } } },
    },
    orderBy: { updatedAt: "desc" },
  }),

  prisma.shoppingList.findMany({
    where: { userId, archived: false, ...listClientFilter },
    select: {
      id: true,
      slug: true,
      name: true,
      pinned: true,
      updatedAt: true,
      project: { select: { title: true, clientName: true, client: { select: { name: true } } } },
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

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [clientCount, renderflowProjectCount, listCount, notificationCount, todayEvents, pins, statusRequests, versionRequests, renderDiscussions, listMessages, renderReplies, listReplies, dueTasks] =
    await Promise.all([
      prisma.client.count({ where: { designerId: userId, ...(allowedIds ? { id: { in: allowedIds } } : {}) } }),
      prisma.project.count({ where: { userId, archived: false, modules: { has: "renderflow" }, ...clientFilter } }),
      prisma.shoppingList.count({ where: { userId, archived: false, ...listClientFilter } }),
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
          render: { project: { userId, ...clientFilter }, archived: false },
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
          render: { project: { userId, ...clientFilter }, archived: false },
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
          product: { section: { list: { userId, ...listClientFilter } } },
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

      // Unread render discussion replies
      prisma.reply.findMany({
        where: {
          viewedByDesigner: false,
          comment: {
            isInternal: false,
            render: { project: { userId, ...clientFilter }, archived: false },
          },
        },
        select: {
          id: true,
          content: true,
          author: true,
          createdAt: true,
          commentId: true,
          comment: {
            select: {
              renderId: true,
              render: {
                select: {
                  name: true,
                  project: { select: { id: true, title: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Unread list product replies
      prisma.listProductReply.findMany({
        where: {
          viewedByDesigner: false,
          comment: {
            product: { section: { list: { userId, ...listClientFilter } } },
          },
        },
        select: {
          id: true,
          content: true,
          author: true,
          createdAt: true,
          commentId: true,
          comment: {
            select: {
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
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Tasks due today or overdue (not done)
      prisma.task.findMany({
        where: {
          ownerId: userId,
          status: { not: "DONE" },
          dueDate: { lte: endOfToday },
          parentId: null,
          ...(allowedIds ? { OR: [{ projectId: null }, { project: { clientId: { in: allowedIds } } }] } : {}),
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          status: true,
          priority: true,
          project: { select: { title: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
    ]);

  // Compute per-project unread counts from already-fetched data
  const projectUnreadPins = new Map<string, number>();
  const projectUnreadChat = new Map<string, number>();

  for (const pin of pins) {
    const pid = pin.render.project.id;
    projectUnreadPins.set(pid, (projectUnreadPins.get(pid) ?? 0) + 1);
  }
  for (const d of renderDiscussions) {
    const pid = d.render.project.id;
    projectUnreadChat.set(pid, (projectUnreadChat.get(pid) ?? 0) + 1);
  }
  for (const r of renderReplies) {
    const pid = r.comment.render.project.id;
    projectUnreadChat.set(pid, (projectUnreadChat.get(pid) ?? 0) + 1);
  }

  // Sort by total unread DESC, take top 3
  const recentProjects = [...recentProjectsCandidates]
    .sort((a, b) => {
      const totalA = (projectUnreadPins.get(a.id) ?? 0) + (projectUnreadChat.get(a.id) ?? 0);
      const totalB = (projectUnreadPins.get(b.id) ?? 0) + (projectUnreadChat.get(b.id) ?? 0);
      return totalB - totalA;
    })
    .slice(0, 3);

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
      hiddenModules={hiddenModules}
      stats={{
        clients: clientCount,
        projects: activeProjectCount,
        renderflowProjects: renderflowProjectCount,
        lists: listCount,
        notificationCount,
      }}
      recentProjects={recentProjects.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        clientName: p.client?.name ?? p.clientName,
        pinned: p.pinned,
        renderCount: p._count.renders,
        lastRenderUrl: p.renders[0]?.fileUrl ?? null,
        lastRenderFileType: p.renders[0]?.fileType ?? null,
        updatedAt: p.updatedAt.toISOString(),
        unreadPins: projectUnreadPins.get(p.id) ?? 0,
        unreadChat: projectUnreadChat.get(p.id) ?? 0,
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
        clientName: l.project?.client?.name ?? l.project?.clientName ?? null,
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
      renderReplies={renderReplies.map((r) => ({
        id: r.id,
        content: r.content,
        author: r.author,
        createdAt: r.createdAt.toISOString(),
        commentId: r.commentId,
        renderId: r.comment.renderId,
        renderName: r.comment.render.name,
        projectId: r.comment.render.project.id,
        projectTitle: r.comment.render.project.title,
      }))}
      listReplies={listReplies.map((r) => ({
        id: r.id,
        content: r.content,
        author: r.author,
        createdAt: r.createdAt.toISOString(),
        commentId: r.commentId,
        productId: r.comment.productId,
        productName: r.comment.product.name,
        listId: r.comment.product.section.list.id,
        listName: r.comment.product.section.list.name,
        listSlug: r.comment.product.section.list.slug,
      }))}
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
      dueTasks={dueTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate!.toISOString(),
        status: t.status,
        priority: t.priority,
        projectTitle: t.project?.title ?? null,
      }))}
    />
  );
}

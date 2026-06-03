import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const userId = getWorkspaceUserId(session);

  const [projects, rooms, renders, lists, clients, products, folders, tasks, calendarEvents, notes] = await Promise.all([
    prisma.project.findMany({
      where: {
        userId,
        archived: false,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { clientName: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, clientName: true, slug: true },
      take: 5,
    }),

    prisma.room.findMany({
      where: {
        project: { userId, archived: false },
        name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, name: true, projectId: true, project: { select: { title: true, slug: true } } },
      take: 5,
    }),

    prisma.render.findMany({
      where: {
        project: { userId, archived: false },
        archived: false,
        name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, name: true, projectId: true, fileUrl: true, project: { select: { title: true, slug: true } } },
      take: 5,
    }),

    prisma.shoppingList.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, slug: true },
      take: 5,
    }),

    prisma.projectClient.findMany({
      where: {
        project: { userId, archived: false },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, projectId: true, project: { select: { title: true, slug: true } } },
      take: 5,
    }),

    prisma.product.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { manufacturer: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { supplier: { contains: q, mode: "insensitive" } },
          { catalogNumber: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, manufacturer: true, category: true, imageUrl: true },
      take: 5,
    }),

    prisma.folder.findMany({
      where: {
        archived: false,
        name: { contains: q, mode: "insensitive" },
        room: { project: { userId, archived: false } },
      },
      select: {
        id: true,
        name: true,
        roomId: true,
        room: { select: { projectId: true, project: { select: { title: true } } } },
      },
      take: 5,
    }),

    prisma.task.findMany({
      where: {
        ownerId: userId,
        title: { contains: q, mode: "insensitive" },
      },
      select: { id: true, title: true, status: true, parentId: true, parent: { select: { title: true } } },
      take: 5,
    }),

    prisma.calendarEvent.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, type: true, startAt: true },
      take: 5,
    }),

    prisma.note.findMany({
      where: {
        userId,
        archived: false,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, content: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    results: {
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.clientName ?? undefined,
        href: `/klienci/${p.slug ?? p.id}`,
      })),
      rooms: rooms.map((r) => ({
        id: r.id,
        title: r.name,
        subtitle: r.project.title,
        href: `/projects/${r.projectId}/rooms/${r.id}`,
      })),
      renders: renders.map((r) => ({
        id: r.id,
        title: r.name,
        subtitle: r.project.title,
        href: `/projects/${r.projectId}/renders/${r.id}`,
        imageUrl: r.fileUrl,
      })),
      lists: lists.map((l) => ({
        id: l.id,
        title: l.name,
        href: l.slug ? `/listy/${l.slug}` : `/listy`,
      })),
      clients: clients.flatMap((c) => {
        if (!c.project) return [];
        return [{ id: c.id, title: c.name, subtitle: c.email ?? c.project.title, href: `/klienci/${c.project.slug ?? c.projectId}?tab=contacts` }];
      }),
      products: products.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: p.manufacturer ?? p.category ?? undefined,
        href: `/produkty`,
        imageUrl: p.imageUrl ?? undefined,
      })),
      folders: folders.map((f) => ({
        id: f.id,
        title: f.name,
        subtitle: f.room.project.title,
        href: `/projects/${f.room.projectId}/rooms/${f.roomId}`,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: t.parent ? `↳ ${t.parent.title}` : undefined,
        href: `/zadania`,
      })),
      calendarEvents: calendarEvents.map((e) => ({
        id: e.id,
        title: e.title,
        subtitle: new Date(e.startAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }),
        href: `/kalendarz`,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title || "Bez tytułu",
        subtitle: n.content.replace(/<[^>]+>/g, "").slice(0, 60) || undefined,
        href: `/notatnik`,
      })),
    },
  });
}

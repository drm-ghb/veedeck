import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const userId = session.user.id;

  const [projects, rooms, renders, lists, clients, products] = await Promise.all([
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
      select: { id: true, name: true, manufacturer: true, category: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    results: {
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.clientName ?? undefined,
        href: `/projekty/${p.slug ?? p.id}`,
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
      clients: clients.map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: c.email ?? c.project.title,
        href: `/projekty/${c.project.slug ?? c.projectId}#klienci`,
      })),
      products: products.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: p.manufacturer ?? p.category ?? undefined,
        href: `/produkty`,
        imageUrl: p.imageUrl ?? undefined,
      })),
    },
  });
}

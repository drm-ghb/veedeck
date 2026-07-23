import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { getAllowedClientIds } from "@/lib/permissions";
import MoodboardList from "@/components/moodboard/MoodboardList";

export const metadata = { title: "Moodboard" };

export default async function MoodboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = getWorkspaceUserId(session);
  const allowedIds = await getAllowedClientIds(session);

  const [moodboards, clients] = await Promise.all([
    prisma.moodboard.findMany({
      where: {
        userId,
        archived: false,
        ...(allowedIds ? { OR: [{ clientId: null }, { clientId: { in: allowedIds } }] } : {}),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        isSharedWithClient: true,
        createdAt: true,
        updatedAt: true,
        client: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.client.findMany({
      where: {
        designerId: userId,
        archived: false,
        ...(allowedIds ? { id: { in: allowedIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        projects: {
          where: { archived: false },
          select: { id: true, title: true },
          orderBy: { title: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <MoodboardList
      moodboards={moodboards.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      }))}
      clients={clients}
    />
  );
}

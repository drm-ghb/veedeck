import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import NotatnikView from "@/components/notatnik/NotatnikView";

export default async function NotatnikPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const notes = await prisma.note.findMany({
    where: { userId: session.user.id, archived: false },
    orderBy: { updatedAt: "desc" },
  });

  const archivedNotes = await prisma.note.findMany({
    where: { userId: session.user.id, archived: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <NotatnikView
      initialNotes={notes.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        archived: n.archived,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      }))}
      initialArchivedNotes={archivedNotes.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        archived: n.archived,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      }))}
    />
  );
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; listId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, listId } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const list = await prisma.shoppingList.findUnique({
    where: { id: listId, projectId, archived: false },
    select: { name: true },
  });
  if (!list) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  await prisma.shoppingList.update({ where: { id: listId }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  const user = session.user as any;
  await prisma.clientEvent.create({
    data: {
      projectId,
      type: "list_view",
      clientEmail: user.email ?? null,
      clientName: user.name ?? null,
      meta: { listId, listName: list.name },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}

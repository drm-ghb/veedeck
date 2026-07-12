import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const clientName: string | null = body.clientName ?? null;

  const list = await prisma.shoppingList.findUnique({
    where: { shareToken: token, archived: false },
    select: { id: true, name: true, projectId: true },
  });
  if (!list) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  await prisma.shoppingList.update({ where: { id: list.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  if (list.projectId) {
    await prisma.clientEvent.create({
      data: {
        projectId: list.projectId,
        type: "list_view",
        clientName,
        meta: { listId: list.id, listName: list.name },
      },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

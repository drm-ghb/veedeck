import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = getWorkspaceUserId(session);

  const list = await prisma.shoppingList.findFirst({ where: { id, userId } });
  if (!list) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const logs = await prisma.listChangeLog.findMany({
    where: { listId: id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { fullName: true, name: true } } },
  });

  const result = logs.map((log) => ({
    id: log.id,
    actorName: log.user?.fullName || log.user?.name || log.userName,
    action: log.action,
    details: log.details,
    source: log.source,
    createdAt: log.createdAt.toISOString(),
  }));

  return NextResponse.json(result);
}

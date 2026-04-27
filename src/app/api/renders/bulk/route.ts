import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { ids, action, roomId, folderId } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Brak ID" }, { status: 400 });
  }

  const renders = await prisma.render.findMany({
    where: { id: { in: ids } },
    include: { project: { select: { userId: true } } },
  });

  if (renders.length !== ids.length || renders.some((r) => r.project.userId !== userId)) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  if (action === "archive") {
    await prisma.render.updateMany({ where: { id: { in: ids } }, data: { archived: true } });
  } else if (action === "delete") {
    await prisma.render.deleteMany({ where: { id: { in: ids } } });
  } else if (action === "move") {
    const data: Record<string, unknown> = {};
    if (roomId !== undefined) data.roomId = roomId;
    data.folderId = folderId ?? null;
    await prisma.render.updateMany({ where: { id: { in: ids } }, data });
  } else {
    return NextResponse.json({ error: "Nieznana akcja" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

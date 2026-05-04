import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { roomId, ids } = await req.json();
  if (!roomId || !Array.isArray(ids)) {
    return NextResponse.json({ error: "Brak danych" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { project: { select: { userId: true } } },
  });

  if (!room || room.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  await Promise.all(
    (ids as string[]).map((id, index) =>
      prisma.folder.update({ where: { id }, data: { order: index } })
    )
  );

  return NextResponse.json({ success: true });
}

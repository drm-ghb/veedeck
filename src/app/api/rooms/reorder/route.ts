import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { projectId, ids } = await req.json();
  if (!Array.isArray(ids) || !projectId) {
    return NextResponse.json({ error: "Brak danych" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });

  if (!project || project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  await Promise.all(
    (ids as string[]).map((roomId, index) =>
      prisma.room.update({ where: { id: roomId }, data: { order: index } })
    )
  );

  return NextResponse.json({ success: true });
}

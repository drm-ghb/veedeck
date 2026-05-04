import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const { ids } = await req.json();
  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: "Brak danych" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!project || project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  await Promise.all(
    (ids as string[]).map((clientId, index) =>
      prisma.projectClient.update({ where: { id: clientId }, data: { order: index } })
    )
  );

  return NextResponse.json({ success: true });
}

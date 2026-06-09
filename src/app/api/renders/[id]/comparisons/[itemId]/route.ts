import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

async function getAuthorizedItem(renderId: string, itemId: string, userId: string) {
  const item = await prisma.renderComparisonItem.findUnique({
    where: { id: itemId },
    include: { render: { include: { project: { select: { userId: true } } } } },
  });
  if (!item || item.renderId !== renderId || item.render.project.userId !== userId) return null;
  return item;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, itemId } = await params;
  const item = await getAuthorizedItem(id, itemId, getWorkspaceUserId(session));
  if (!item) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { displayName } = await req.json();

  const updated = await prisma.renderComparisonItem.update({
    where: { id: itemId },
    data: { displayName: displayName?.trim() || null },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, itemId } = await params;
  const item = await getAuthorizedItem(id, itemId, getWorkspaceUserId(session));
  if (!item) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  await prisma.renderComparisonItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true });
}

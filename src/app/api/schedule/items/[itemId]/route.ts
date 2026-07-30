import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

async function getItemAndVerify(itemId: string, userId: string) {
  return prisma.scheduleItem.findFirst({
    where: {
      id: itemId,
      phase: {
        OR: [
          { client: { project: { userId } } },
          { client: { client: { designerId: userId } } },
        ],
      },
    },
  });
}

// PATCH /api/schedule/items/[itemId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { itemId } = await params;
  const item = await getItemAndVerify(itemId, userId);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.scheduleItem.update({
    where: { id: itemId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      ...(body.done !== undefined && { done: body.done }),
      ...(body.hidden !== undefined && { hidden: body.hidden }),
      ...(body.isSection !== undefined && { isSection: body.isSection }),
      ...(body.order !== undefined && { order: body.order }),
      ...(body.phaseId !== undefined && { phaseId: body.phaseId }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/schedule/items/[itemId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { itemId } = await params;
  const item = await getItemAndVerify(itemId, userId);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.scheduleItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}

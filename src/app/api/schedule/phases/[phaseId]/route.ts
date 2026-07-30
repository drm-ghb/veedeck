import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

async function getPhaseAndVerify(phaseId: string, userId: string) {
  return prisma.schedulePhase.findFirst({
    where: {
      id: phaseId,
      OR: [
        { client: { project: { userId } } },
        { client: { client: { designerId: userId } } },
      ],
    },
  });
}

// PATCH /api/schedule/phases/[phaseId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { phaseId } = await params;
  const phase = await getPhaseAndVerify(phaseId, userId);
  if (!phase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.schedulePhase.update({
    where: { id: phaseId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      ...(body.done !== undefined && { done: body.done }),
      ...(body.hidden !== undefined && { hidden: body.hidden }),
      ...(body.order !== undefined && { order: body.order }),
      ...(body.rfProjectId !== undefined && { rfProjectId: body.rfProjectId || null }),
    },
    include: { items: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] }, rfProject: { select: { id: true, title: true } } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/schedule/phases/[phaseId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { phaseId } = await params;
  const phase = await getPhaseAndVerify(phaseId, userId);
  if (!phase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.schedulePhase.delete({ where: { id: phaseId } });
  return NextResponse.json({ ok: true });
}

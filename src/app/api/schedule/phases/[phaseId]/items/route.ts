import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// POST /api/schedule/phases/[phaseId]/items — create item in phase
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { phaseId } = await params;

  const phase = await prisma.schedulePhase.findFirst({
    where: {
      id: phaseId,
      OR: [
        { client: { project: { userId } } },
        { client: { client: { designerId: userId } } },
      ],
    },
    select: { id: true },
  });
  if (!phase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, startDate, endDate, isSection } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const count = await prisma.scheduleItem.count({ where: { phaseId } });

  const item = await prisma.scheduleItem.create({
    data: {
      phaseId,
      name: name.trim(),
      order: count,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      isSection: isSection === true,
    },
  });

  return NextResponse.json(item);
}

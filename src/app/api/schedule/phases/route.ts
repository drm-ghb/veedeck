import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// GET /api/schedule/phases?clientId=xxx — fetch all phases + items for a client
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const client = await prisma.projectClient.findFirst({
    where: {
      id: clientId,
      OR: [{ client: { designerId: userId } }, { project: { userId } }],
    },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const phases = await prisma.schedulePhase.findMany({
    where: { clientId },
    include: {
      items: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      rfProject: { select: { id: true, title: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(phases);
}

// POST /api/schedule/phases — create a new phase
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { clientId, name, rfProjectId } = await req.json();
  if (!clientId || !name?.trim()) return NextResponse.json({ error: "clientId and name required" }, { status: 400 });

  const client = await prisma.projectClient.findFirst({
    where: {
      id: clientId,
      OR: [{ client: { designerId: userId } }, { project: { userId } }],
    },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await prisma.schedulePhase.count({ where: { clientId } });

  const phase = await prisma.schedulePhase.create({
    data: { clientId, name: name.trim(), order: count, rfProjectId: rfProjectId ?? null },
    include: { items: true, rfProject: { select: { id: true, title: true } } },
  });

  return NextResponse.json(phase);
}

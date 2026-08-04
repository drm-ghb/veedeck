import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// GET — clients assigned to a team member
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).ownerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;

  const member = await prisma.user.findFirst({ where: { id, ownerId } });
  if (!member) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const assignments = await prisma.clientAssignment.findMany({
    where: { userId: id },
    include: { client: { select: { id: true, name: true } } },
  });

  return NextResponse.json(assignments.map((a) => ({ id: a.client.id, name: a.client.name })));
}

// POST — assign a client to the member
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).ownerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;
  const { clientId } = await req.json();

  const member = await prisma.user.findFirst({ where: { id, ownerId } });
  if (!member) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const client = await prisma.client.findFirst({ where: { id: clientId, designerId: ownerId } });
  if (!client) return NextResponse.json({ error: "Klient nie istnieje" }, { status: 404 });

  await prisma.clientAssignment.upsert({
    where: { clientId_userId: { clientId, userId: id } },
    create: { clientId, userId: id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

// DELETE — unassign a client from the member
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).ownerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;
  const { clientId } = await req.json();

  const member = await prisma.user.findFirst({ where: { id, ownerId } });
  if (!member) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  await prisma.clientAssignment.deleteMany({
    where: { clientId, userId: id },
  });

  return NextResponse.json({ ok: true });
}

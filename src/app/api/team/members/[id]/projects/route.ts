import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// GET — projects assigned to a team member
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

  const assignments = await prisma.projectAssignment.findMany({
    where: { userId: id },
    include: { project: { select: { id: true, title: true } } },
  });

  return NextResponse.json(assignments.map((a) => ({ id: a.project.id, title: a.project.title })));
}

// POST — assign a project to the member
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).ownerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;
  const { projectId } = await req.json();

  const member = await prisma.user.findFirst({ where: { id, ownerId } });
  if (!member) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: ownerId } });
  if (!project) return NextResponse.json({ error: "Projekt nie istnieje" }, { status: 404 });

  await prisma.projectAssignment.upsert({
    where: { projectId_userId: { projectId, userId: id } },
    create: { projectId, userId: id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

// DELETE — unassign a project from the member
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).ownerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;
  const { projectId } = await req.json();

  const member = await prisma.user.findFirst({ where: { id, ownerId } });
  if (!member) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  await prisma.projectAssignment.deleteMany({
    where: { projectId, userId: id },
  });

  return NextResponse.json({ ok: true });
}

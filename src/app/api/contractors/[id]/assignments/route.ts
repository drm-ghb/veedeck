import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);
  const { id } = await params;

  const contractor = await prisma.contractor.findFirst({ where: { id, designerId } });
  if (!contractor) {
    return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });
  }

  const assignments = await prisma.contractorAssignment.findMany({
    where: { contractorId: id },
    include: {
      project: { select: { id: true, title: true, clientName: true } },
      folders: { include: { _count: { select: { files: true } } }, orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assignments);
}

const DEFAULT_FOLDERS = [
  { name: "Rysunki techniczne", type: "rysunki", order: 0 },
  { name: "Wizualizacje", type: "wizualizacje", order: 1 },
  { name: "Dokumenty", type: "dokumenty", order: 2 },
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);
  const { id } = await params;

  const contractor = await prisma.contractor.findFirst({ where: { id, designerId } });
  if (!contractor) {
    return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });
  }

  const { projectId } = await req.json();
  if (!projectId) {
    return NextResponse.json({ error: "projectId jest wymagany" }, { status: 400 });
  }

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: designerId } });
  if (!project) {
    return NextResponse.json({ error: "Nie znaleziono projektu" }, { status: 404 });
  }

  const existing = await prisma.contractorAssignment.findFirst({
    where: { contractorId: id, projectId },
  });
  if (existing) {
    if (!existing.archived) {
      return NextResponse.json({ error: "Wykonawca jest już przypisany do tego projektu" }, { status: 409 });
    }
    // Reactivate archived assignment
    const assignment = await prisma.contractorAssignment.update({
      where: { id: existing.id },
      data: { archived: false },
      include: {
        project: { select: { id: true, title: true, clientName: true } },
        folders: { include: { _count: { select: { files: true } } }, orderBy: { order: "asc" } },
      },
    });
    return NextResponse.json(assignment, { status: 201 });
  }

  const assignment = await prisma.contractorAssignment.create({
    data: {
      contractorId: id,
      projectId,
      designerId,
      folders: { create: DEFAULT_FOLDERS },
    },
    include: {
      project: { select: { id: true, title: true, clientName: true } },
      folders: { include: { _count: { select: { files: true } } }, orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}

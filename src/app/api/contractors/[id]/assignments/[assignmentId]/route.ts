import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);
  const { id, assignmentId } = await params;

  const contractor = await prisma.contractor.findFirst({ where: { id, designerId } });
  if (!contractor) {
    return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });
  }

  const assignment = await prisma.contractorAssignment.findFirst({
    where: { id: assignmentId, contractorId: id },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Nie znaleziono przypisania" }, { status: 404 });
  }

  const {
    archived,
    investmentStreet,
    investmentCity,
    investmentPostalCode,
    investmentCountry,
    designerContactName,
    designerContactPhone,
    investorContactName,
    investorContactPhone,
    projectNotes,
  } = await req.json();

  const updated = await prisma.contractorAssignment.update({
    where: { id: assignmentId },
    data: {
      archived: archived ?? assignment.archived,
      ...(investmentStreet !== undefined && { investmentStreet: investmentStreet || null }),
      ...(investmentCity !== undefined && { investmentCity: investmentCity || null }),
      ...(investmentPostalCode !== undefined && { investmentPostalCode: investmentPostalCode || null }),
      ...(investmentCountry !== undefined && { investmentCountry: investmentCountry || null }),
      ...(designerContactName !== undefined && { designerContactName: designerContactName || null }),
      ...(designerContactPhone !== undefined && { designerContactPhone: designerContactPhone || null }),
      ...(investorContactName !== undefined && { investorContactName: investorContactName || null }),
      ...(investorContactPhone !== undefined && { investorContactPhone: investorContactPhone || null }),
      ...(projectNotes !== undefined && { projectNotes: projectNotes || null }),
    },
    include: {
      project: { select: { id: true, title: true, clientName: true } },
      folders: { include: { _count: { select: { files: true } } }, orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);
  const { id, assignmentId } = await params;

  const contractor = await prisma.contractor.findFirst({ where: { id, designerId } });
  if (!contractor) {
    return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });
  }

  const assignment = await prisma.contractorAssignment.findFirst({
    where: { id: assignmentId, contractorId: id },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Nie znaleziono przypisania" }, { status: 404 });
  }

  // Delete in order: replies → comments → files → folders → assignment
  const folderIds = (
    await prisma.contractorFolder.findMany({ where: { assignmentId }, select: { id: true } })
  ).map((f) => f.id);

  const fileIds = (
    await prisma.contractorFile.findMany({ where: { folderId: { in: folderIds } }, select: { id: true } })
  ).map((f) => f.id);

  await prisma.contractorFileReply.deleteMany({ where: { comment: { fileId: { in: fileIds } } } });
  await prisma.contractorFileComment.deleteMany({ where: { fileId: { in: fileIds } } });
  await prisma.contractorFile.deleteMany({ where: { id: { in: fileIds } } });
  await prisma.contractorFolder.deleteMany({ where: { id: { in: folderIds } } });
  await prisma.contractorAssignment.delete({ where: { id: assignmentId } });

  return NextResponse.json({ ok: true });
}

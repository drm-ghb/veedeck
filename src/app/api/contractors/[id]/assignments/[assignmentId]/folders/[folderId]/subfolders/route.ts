import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string; folderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);
  const { id, assignmentId, folderId } = await params;

  const contractor = await prisma.contractor.findFirst({ where: { id, designerId } });
  if (!contractor) {
    return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });
  }

  const parentFolder = await prisma.contractorFolder.findFirst({
    where: { id: folderId, assignmentId },
  });
  if (!parentFolder) {
    return NextResponse.json({ error: "Nie znaleziono folderu" }, { status: 404 });
  }

  const { name, renders } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Nazwa podfolderu jest wymagana" }, { status: 400 });
  }

  // renders: { renderId, name, fileType }[]
  const subfolder = await prisma.contractorFolder.create({
    data: {
      assignmentId,
      parentId: folderId,
      name,
      type: parentFolder.type,
      files: renders?.length
        ? {
            create: renders.map((r: { renderId: string; name: string; fileType: string }) => ({
              renderId: r.renderId,
              name: r.name,
              fileType: r.fileType,
              uploadedById: session.user!.id!,
            })),
          }
        : undefined,
    },
    include: {
      files: {
        include: { render: { select: { id: true, name: true, fileUrl: true, fileType: true } } },
      },
    },
  });

  return NextResponse.json(subfolder, { status: 201 });
}

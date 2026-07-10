import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
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

  const folder = await prisma.contractorFolder.findFirst({
    where: { id: folderId, assignmentId },
  });
  if (!folder) {
    return NextResponse.json({ error: "Nie znaleziono folderu" }, { status: 404 });
  }

  const files = await prisma.contractorFile.findMany({
    where: { folderId },
    include: { render: { select: { id: true, name: true, fileUrl: true, fileType: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(files);
}

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

  const folder = await prisma.contractorFolder.findFirst({
    where: { id: folderId, assignmentId },
  });
  if (!folder) {
    return NextResponse.json({ error: "Nie znaleziono folderu" }, { status: 404 });
  }

  const { renderId, fileUrl, fileKey, fileType, name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Nazwa pliku jest wymagana" }, { status: 400 });
  }
  if (!renderId && !fileUrl) {
    return NextResponse.json({ error: "Wymagany renderId lub fileUrl" }, { status: 400 });
  }

  const duplicate = await prisma.contractorFile.findFirst({
    where: { folderId, name: { equals: name, mode: "insensitive" } },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Plik o tej nazwie już istnieje" }, { status: 409 });
  }

  const file = await prisma.contractorFile.create({
    data: {
      folderId,
      name,
      renderId: renderId || null,
      fileUrl: fileUrl || null,
      fileKey: fileKey || null,
      fileType: fileType || "image",
      uploadedById: session.user.id!,
    },
    include: { render: { select: { id: true, name: true, fileUrl: true, fileType: true } } },
  });

  return NextResponse.json(file, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content, viewedByDesigner, posX, posY } = await req.json();

  const comment = await prisma.contractorFileComment.findUnique({ where: { id } });
  if (!comment) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const updated = await prisma.contractorFileComment.update({
    where: { id },
    data: {
      ...(content !== undefined ? { content: content.trim() } : {}),
      ...(viewedByDesigner !== undefined ? { viewedByDesigner } : {}),
      ...(posX !== undefined ? { posX } : {}),
      ...(posY !== undefined ? { posY } : {}),
    },
  });

  if (content !== undefined) {
    await pusherServer.trigger(`contractor-file-${comment.fileId}`, "comment-edited", {
      id,
      content: content.trim(),
    });
  }

  if (posX !== undefined || posY !== undefined) {
    await pusherServer.trigger(`contractor-file-${comment.fileId}`, "pin-moved", {
      id,
      posX: updated.posX,
      posY: updated.posY,
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const comment = await prisma.contractorFileComment.findUnique({ where: { id } });
  if (!comment) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  await prisma.contractorFileComment.delete({ where: { id } });
  await pusherServer.trigger(`contractor-file-${comment.fileId}`, "comment-deleted", { id });

  return NextResponse.json({ success: true });
}

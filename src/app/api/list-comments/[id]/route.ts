import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getWorkspaceUserId } from "@/lib/workspace";
import { hasPermission } from "@/lib/permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { viewedByDesigner, content, authorName } = body;

  const comment = await prisma.listProductComment.findUnique({
    where: { id },
    select: {
      author: true,
      productId: true,
      product: { select: { section: { select: { list: { select: { userId: true, id: true } } } } } },
    },
  });

  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  const isOwner = comment.product.section.list.userId === session.user.id;
  const isAuthor = content !== undefined && comment.author === authorName;

  if (!isOwner && !isAuthor) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const updated = await prisma.listProductComment.update({
    where: { id },
    data: {
      ...(isOwner && viewedByDesigner !== undefined ? { viewedByDesigner } : {}),
      ...(content !== undefined ? { content: content.trim() } : {}),
    },
  });

  if (content !== undefined) {
    await pusherServer.trigger(`list-product-${comment.productId}`, "comment-edited", {
      id,
      content: content.trim(),
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const comment = await prisma.listProductComment.findUnique({
    where: { id },
    include: { product: { include: { section: { include: { list: { select: { id: true, userId: true } } } } } } },
  });
  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  const isOwner = comment.product.section.list.userId === getWorkspaceUserId(session);
  if (!isOwner && !await hasPermission(session, "listy", 2)) {
    return NextResponse.json({ error: "Brak uprawnień do usuwania komentarzy" }, { status: 403 });
  }

  await prisma.listProductComment.delete({ where: { id } });
  await pusherServer.trigger(`list-product-${comment.productId}`, "comment-deleted", { id });
  await pusherServer.trigger(`shopping-list-${comment.product.section.list.id}`, "comment-activity", { productId: comment.productId, action: "deleted" });

  return NextResponse.json({ success: true });
}

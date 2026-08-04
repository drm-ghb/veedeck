import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { auth } from "@/lib/auth";
import { getWorkspaceUserId } from "@/lib/workspace";
import { hasPermission } from "@/lib/permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, replyId } = await params;
  const { content, viewedByDesigner } = await req.json();
  if (content !== undefined && !content?.trim()) return NextResponse.json({ error: "Brak treści" }, { status: 400 });

  const comment = await prisma.listProductComment.findUnique({
    where: { id },
    select: {
      productId: true,
      product: { select: { section: { select: { list: { select: { userId: true } } } } } },
    },
  });
  if (!comment) return NextResponse.json({ error: "Nie znaleziono komentarza" }, { status: 404 });

  const isOwner = comment.product.section.list.userId === getWorkspaceUserId(session);
  if (!isOwner && !await hasPermission(session, "listy", 2)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const reply = await prisma.listProductReply.update({
    where: { id: replyId },
    data: {
      ...(content !== undefined ? { content: content.trim() } : {}),
      ...(viewedByDesigner !== undefined ? { viewedByDesigner } : {}),
    },
  });

  await pusherServer.trigger(`list-product-${comment.productId}`, "reply-updated", {
    commentId: id,
    reply,
  });

  return NextResponse.json(reply);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, replyId } = await params;

  const comment = await prisma.listProductComment.findUnique({
    where: { id },
    select: {
      productId: true,
      product: { select: { section: { select: { list: { select: { userId: true } } } } } },
    },
  });
  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono komentarza" }, { status: 404 });
  }

  const isOwner = comment.product.section.list.userId === getWorkspaceUserId(session);
  if (!isOwner && !await hasPermission(session, "listy", 2)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  await prisma.listProductReply.delete({ where: { id: replyId } });

  await pusherServer.trigger(`list-product-${comment.productId}`, "reply-deleted", {
    commentId: id,
    replyId,
  });

  return NextResponse.json({ success: true });
}

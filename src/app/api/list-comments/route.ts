import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { auth } from "@/lib/auth";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Brak productId" }, { status: 400 });

  const comments = await prisma.listProductComment.findMany({
    where: { productId },
    include: { replies: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const { productId, content, author, listShareToken } = await req.json();

  if (!productId || !content || !author) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  const comment = await prisma.listProductComment.create({
    data: { productId, content, author },
    include: { replies: true },
  });

  await pusherServer.trigger(`list-product-${productId}`, "new-comment", comment);

  // Create notification for the list owner
  const product = await prisma.listProduct.findUnique({
    where: { id: productId },
    include: {
      section: {
        include: {
          list: { select: { id: true, slug: true, name: true, userId: true, shareToken: true, projectId: true, project: { select: { title: true } } } },
        },
      },
    },
  });

  if (product) {
    const list = product.section.list;
    // If the request includes the list's share token, the commenter is a client
    // (even if the designer is logged in on the same browser during testing)
    const isClientViaShareLink = !!(listShareToken && list.shareToken === listShareToken);
    const isDesigner = !isClientViaShareLink && !!(session?.user?.id && getWorkspaceUserId(session) === list.userId);
    // Trigger list-level event for real-time badge updates
    await pusherServer.trigger(`shopping-list-${list.id}`, "comment-activity", { productId, action: "new" });
    const listPath = list.slug ?? list.id;
    if (!isDesigner) {
      const notification = await prisma.notification.create({
        data: {
          userId: list.userId,
          message: `${author} dodał komentarz do produktu „${product.name}" w liście „${list.name}"`,
          link: `/listy/${listPath}?product=${productId}`,
          type: "list_comment",
        },
      });
      await pusherServer.trigger(`user-${list.userId}`, "new-notification", notification);
    }
  }

  return NextResponse.json(comment, { status: 201 });
}

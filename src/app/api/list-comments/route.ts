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
  const { productId, content, author } = await req.json();

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
          list: { select: { id: true, slug: true, name: true, userId: true, projectId: true, project: { select: { title: true } } } },
        },
      },
    },
  });

  if (product) {
    const list = product.section.list;
    // Trigger list-level event for real-time badge updates
    await pusherServer.trigger(`shopping-list-${list.id}`, "comment-activity", { productId, action: "new" });
    const listPath = list.slug ?? list.id;
    const notification = await prisma.notification.create({
      data: {
        userId: list.userId,
        message: `${author} dodał komentarz do produktu „${product.name}" w liście „${list.name}"`,
        link: `/listy/${listPath}?product=${productId}`,
        type: "list_comment",
      },
    });
    await pusherServer.trigger(`user-${list.userId}`, "new-notification", notification);

    // Aggregate into project discussion if list is linked to a project (non-blocking)
    if (list.projectId) {
      try {
        let discussion = await prisma.discussion.findUnique({
          where: { projectId: list.projectId },
        });
        // Auto-create project discussion if it doesn't exist yet
        if (!discussion) {
          discussion = await prisma.discussion.create({
            data: {
              title: list.project?.title ?? list.name,
              type: "project",
              ownerId: list.userId,
              projectId: list.projectId,
            },
          });
        }
        const sourceUrl = `/listy/${listPath}?product=${productId}`;
        const isDesigner = session?.user?.id && getWorkspaceUserId(session) === list.userId;
        const msg = await prisma.discussionMessage.create({
          data: {
            discussionId: discussion.id,
            content,
            authorName: author,
            sourceType: "product_comment",
            sourceId: comment.id,
            sourceUrl,
            sourceName: `${list.name} › ${product.name}`,
            sourceImageUrl: product.imageUrl ?? null,
            userId: isDesigner ? session!.user!.id : null,
          },
        });
        await pusherServer.trigger(`discussion-${discussion.id}`, "new-message", msg);
      } catch (e) {
        console.error("[list-comments] Discussion aggregation failed:", e);
      }
    }
  }

  return NextResponse.json(comment, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { auth } from "@/lib/auth";
import { getWorkspaceUserId } from "@/lib/workspace";
import { notifyClientDesignerListReply } from "@/lib/email";
import { hasPermission } from "@/lib/permissions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;
  const { content, author, listShareToken } = await req.json();

  if (session?.user?.id) {
    if (!await hasPermission(session, "listy", 2)) {
      return NextResponse.json({ error: "Brak uprawnień do dodawania odpowiedzi" }, { status: 403 });
    }
  } else if (!listShareToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!content || !author) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  const comment = await prisma.listProductComment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono komentarza" }, { status: 404 });
  }

  const reply = await prisma.listProductReply.create({
    data: { commentId: id, content, author, viewedByDesigner: !!(session?.user?.id && !listShareToken) },
  });

  await pusherServer.trigger(`list-product-${comment.productId}`, "comment-reply", {
    commentId: id,
    reply: { ...reply, createdAt: reply.createdAt.toISOString() },
  });

  // Email notification to clients with accounts who have enabled listy notifications
  const product = await prisma.listProduct.findUnique({
    where: { id: comment.productId },
    include: {
      section: {
        include: {
          list: {
            select: {
              id: true,
              name: true,
              slug: true,
              userId: true,
              projectId: true,
              project: {
                select: {
                  clients: {
                    select: {
                      user: { select: { id: true, name: true, fullName: true, contactEmail: true, emailNotifEnabled: true, emailNotifModules: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (product) {
    const list = product.section.list;
    const isDesigner = !!(session?.user?.id && getWorkspaceUserId(session) === list.userId);
    if (isDesigner && list.project) {
      const designer = await prisma.user.findUnique({
        where: { id: list.userId },
        select: { name: true, fullName: true },
      });
      const designerName = designer?.fullName || designer?.name || "Projektant";
      const listPath = list.slug ?? list.id;
      for (const pc of list.project.clients) {
        const cu = pc.user;
        if (cu?.contactEmail && cu.emailNotifEnabled && cu.emailNotifModules.includes("listy")) {
          notifyClientDesignerListReply({
            clientEmail: cu.contactEmail,
            listName: list.name,
            listPath,
            productName: product.name,
            productId: comment.productId,
            designerName,
            content,
          }).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json(reply, { status: 201 });
}
